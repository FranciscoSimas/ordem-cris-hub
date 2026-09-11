import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

interface CharacterData {
  name: string;
  attributes: {
    FOR: number;
    AGI: number;
    INT: number;
    VIG: number;
    PRE: number;
  };
  skills: Array<{
    name: string;
    base: number;
    bonus: number;
    total: number;
  }>;
}

// Use Browserless.io via WebSocket connection
async function scrapeWithBrowserless(url: string): Promise<string> {
  const browserlessToken = process.env.BROWSERLESS_TOKEN;
  
  if (!browserlessToken) {
    throw new Error('BROWSERLESS_TOKEN not configured');
  }

  console.log('[CRIS Import] Using Browserless.io service...');
  
  // Connect to Browserless.io via WebSocket
  const browserWSEndpoint = `wss://chrome.browserless.io?token=${browserlessToken}`;
  
  const browser = await puppeteer.connect({
    browserWSEndpoint: browserWSEndpoint,
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Wait for Vue to render
    try {
      await page.waitForSelector('button.attr.str', { timeout: 15000 });
      await page.waitForSelector('table.skills-table', { timeout: 10000 });
    } catch (e) {
      console.warn('[CRIS Import] Key selectors not found immediately');
    }
    
    // Wait for content to be fully rendered
    try {
      await page.waitForFunction(
        () => {
          const attrButtons = document.querySelectorAll('button.attr').length;
          const skillsTable = document.querySelector('table.skills-table');
          return attrButtons >= 5 && skillsTable !== null;
        },
        { timeout: 10000 }
      );
    } catch (e) {
      console.warn('[CRIS Import] Wait function timed out');
    }
    
    await page.waitForTimeout(5000);
    const html = await page.content();
    
    await page.close();
    await browser.disconnect();
    
    console.log('[CRIS Import] Successfully scraped with Browserless.io');
    return html;
  } catch (error) {
    await browser.disconnect();
    throw error;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (!url.includes('crisordemparanormal.com') && !url.includes('cris.com')) {
    return res.status(400).json({ error: 'Invalid C.R.I.S. URL' });
  }

  let browser: any = null;
  let html: string = '';
  
  try {
    console.log('[CRIS Import] Starting import process...');
    console.log('[CRIS Import] URL:', url);
    
    // Try Puppeteer first
    try {
      const executablePath = await chromium.executablePath();
      console.log('[CRIS Import] Chromium executable path obtained');
      
      browser = await puppeteer.launch({
        args: [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--single-process',
          '--disable-gpu',
        ],
        defaultViewport: chromium.defaultViewport,
        executablePath: executablePath,
        headless: chromium.headless,
      });
      console.log('[CRIS Import] Browser launched successfully');
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });
      
      // Wait for Vue to render - try to find key elements
      try {
        await page.waitForSelector('button.attr.str', { timeout: 15000 });
        console.log('[CRIS Import] Attributes found, waiting for skills table...');
        await page.waitForSelector('table.skills-table', { timeout: 10000 });
        console.log('[CRIS Import] Skills table found');
      } catch (e) {
        console.warn('[CRIS Import] Some selectors not found, continuing anyway');
      }
      
      // Additional wait for Vue to finish rendering all dynamic content
      await page.waitForTimeout(5000);
      
      // Try to wait for specific content to be rendered
      try {
        await page.waitForFunction(
          () => {
            const attrButtons = document.querySelectorAll('button.attr').length;
            const skillsTable = document.querySelector('table.skills-table');
            return attrButtons >= 5 && skillsTable !== null;
          },
          { timeout: 10000 }
        );
        console.log('[CRIS Import] Content fully rendered');
      } catch (e) {
        console.warn('[CRIS Import] Wait function timed out, proceeding anyway');
      }
      
      html = await page.content();
      
      await browser.close();
      browser = null;
      console.log('[CRIS Import] Successfully scraped with Puppeteer');
      
    } catch (puppeteerError: any) {
      console.warn('[CRIS Import] Puppeteer failed, trying Browserless.io...', puppeteerError.message);
      
      // If Puppeteer fails, try Browserless.io
      if (process.env.BROWSERLESS_TOKEN) {
        try {
          html = await scrapeWithBrowserless(url);
          console.log('[CRIS Import] Successfully scraped with Browserless.io');
        } catch (browserlessError: any) {
          throw new Error(`Both Puppeteer and Browserless.io failed. Puppeteer: ${puppeteerError.message}. Browserless: ${browserlessError.message}`);
        }
      } else {
        // If no Browserless token, throw the original error
        throw puppeteerError;
      }
    }

    // Parse HTML with Cheerio
    const $ = cheerio.load(html);
    
    // Debug: check if we have the expected content
    const hasAttrButtons = $('button.attr').length;
    const hasSkillsTable = $('table.skills-table').length;
    console.log(`[CRIS Import] Debug - Found ${hasAttrButtons} attr buttons, ${hasSkillsTable} skills tables`);
    
    // Debug: log a larger HTML snippet to see structure
    const htmlSnippet = html.substring(0, 5000);
    console.log('[CRIS Import] HTML snippet (first 5000 chars):', htmlSnippet);
    
    // Debug: try to find any button with class containing "attr"
    const allAttrButtons = $('button[class*="attr"]');
    console.log(`[CRIS Import] Found ${allAttrButtons.length} buttons with "attr" in class`);
    allAttrButtons.each((i, el) => {
      if (i < 5) { // Log first 5
        console.log(`[CRIS Import] Attr button ${i}:`, $(el).attr('class'), 'text:', $(el).text().trim());
      }
    });

    // Extract character name - try multiple approaches
    let name = 'Personagem Sem Nome';
    
    // Debug: check all text inputs
    const allInputs = $('input[type="text"]');
    console.log(`[CRIS Import] Found ${allInputs.length} text inputs`);
    allInputs.each((i, el) => {
      const $el = $(el);
      const val = String($el.val() || '').trim();
      const placeholder = String($el.attr('placeholder') || '');
      const id = String($el.attr('id') || '');
      const nameAttr = String($el.attr('name') || '');
      console.log(`[CRIS Import] Input ${i}: val="${val}", placeholder="${placeholder}", id="${id}", name="${nameAttr}"`);
      
      if (val && val.length > 0 && val.length < 50 && !/^\d+$/.test(val) && val !== 'PERSONAGEM') {
        if (placeholder.toLowerCase().includes('nome') || 
            id.toLowerCase().includes('name') || 
            nameAttr.toLowerCase().includes('name') ||
            (val.length > 2 && val !== 'PERSONAGEM')) {
          name = val;
          console.log('[CRIS Import] Name found in input:', name);
          return false; // break
        }
      }
    });
    
    // If still not found or is "PERSONAGEM", try to find in page title or other elements
    if (name === 'Personagem Sem Nome' || name === 'PERSONAGEM') {
      // Try page title
      const pageTitle = $('title').text().trim();
      if (pageTitle && pageTitle.length > 0 && pageTitle.length < 50) {
        name = pageTitle;
        console.log('[CRIS Import] Name from title:', name);
      } else {
        // Try headings
        const headings = $('h1, h2, h3');
        for (let i = 0; i < Math.min(10, headings.length); i++) {
          const el = headings.eq(i);
          const text = el.text().trim();
          if (text && text.length > 2 && text.length < 50 && !/^\d+$/.test(text) && !text.includes('%') && text !== 'PERSONAGEM') {
            name = text;
            console.log('[CRIS Import] Name found in heading:', name);
            break;
          }
        }
      }
    }
    
    name = name.replace(/[^\w\s\-]/g, '').trim().substring(0, 100) || 'Personagem Sem Nome';
    if (name === 'PERSONAGEM') {
      name = 'Personagem Sem Nome'; // Don't use "PERSONAGEM" as it's likely a placeholder
    }
    console.log('[CRIS Import] Final name:', name);

    // Extract attributes - try multiple selectors
    const extractAttr = (selectors: string[]): number => {
      for (const selector of selectors) {
        const el = $(selector).first();
        if (el.length) {
          const text = el.text().trim();
          const value = parseInt(text) || 0;
          if (value > 0) {
            console.log(`[CRIS Import] Found attr with selector ${selector}: ${value}`);
            return Math.max(1, Math.min(5, value));
          }
        }
      }
      return 1; // default
    };
    
    const attributes = {
      FOR: extractAttr(['button.attr.str', 'button[class*="attr"][class*="str"]', '.attr.str']),
      AGI: extractAttr(['button.attr.dex', 'button[class*="attr"][class*="dex"]', '.attr.dex']),
      INT: extractAttr(['button.attr.int', 'button[class*="attr"][class*="int"]', '.attr.int']),
      VIG: extractAttr(['button.attr.con', 'button[class*="attr"][class*="con"]', '.attr.con']),
      PRE: extractAttr(['button.attr.pre', 'button[class*="attr"][class*="pre"]', '.attr.pre']),
    };
    console.log('[CRIS Import] Attributes extracted:', attributes);
    
    // Debug: check if we found any attributes
    const foundAttrs = Object.values(attributes).filter(v => v > 1);
    console.log(`[CRIS Import] Found ${foundAttrs.length} attributes with value > 1`);

    // Extract skills
    const skills: CharacterData['skills'] = [];
    
    // Debug: check all tables
    const allTables = $('table');
    console.log(`[CRIS Import] Found ${allTables.length} tables total`);
    allTables.each((i, el) => {
      if (i < 3) { // Log first 3
        const $table = $(el);
        const classes = $table.attr('class') || '';
        const text = $table.text().substring(0, 100);
        console.log(`[CRIS Import] Table ${i}: class="${classes}", text preview="${text}"`);
      }
    });
    
    // Try multiple selectors for skills table
    let skillsTable = $('table.skills-table').first();
    if (!skillsTable.length) {
      skillsTable = $('table[class*="skill"]').first();
    }
    if (!skillsTable.length) {
      // Try to find table by content
      skillsTable = $('table').filter((_, el) => {
        const text = $(el).text();
        return text.includes('PERÍCIA') || text.includes('Acrobacia') || text.includes('Atletismo') || text.includes('Acrobacias');
      }).first();
    }
    
    console.log(`[CRIS Import] Skills table found: ${skillsTable.length > 0}`);
    
    if (skillsTable.length) {
      // Debug: log table HTML structure
      const tableHTML = skillsTable.html()?.substring(0, 1000) || '';
      console.log('[CRIS Import] Skills table HTML snippet:', tableHTML);
    }
    
    if (skillsTable.length) {
      const rows = skillsTable.find('tbody tr, tr').filter((_, row) => {
        // Filter out header row
        const $row = $(row);
        const text = $row.text().toLowerCase();
        return !text.includes('perícia') && !text.includes('dados') && !text.includes('bônus');
      });
      console.log(`[CRIS Import] Found ${rows.length} skill rows (excluding header)`);
      
      rows.each((_, row) => {
        const $row = $(row);
        
        // Try multiple selectors for skill name
        let nameBtn = $row.find('button.naked-button.left').first();
        if (!nameBtn.length) {
          nameBtn = $row.find('button[class*="naked"]').first();
        }
        if (!nameBtn.length) {
          nameBtn = $row.find('button').first();
        }
        if (!nameBtn.length) {
          console.log('[CRIS Import] No name button found in row, skipping');
          return;
        }
        
        let skillName = nameBtn.text().trim();
        skillName = skillName.replace(/[+*]/g, '').replace(/<!---->/g, '').replace(/\s+/g, ' ').trim();
        
        // Skip if name is too short or looks invalid
        if (!skillName || skillName.length < 2 || skillName.length > 30) {
          console.log('[CRIS Import] Invalid skill name, skipping:', skillName);
          return;
        }
        
        // Extract training - try multiple selectors
        let trainingBtn = $row.find('button.dropdown-button.dropdown-underline').first();
        if (!trainingBtn.length) {
          trainingBtn = $row.find('button[class*="dropdown-underline"]').first();
        }
        let trainingText = trainingBtn.length ? trainingBtn.text().trim() : '';
        trainingText = trainingText.replace(/<!---->/g, '').replace(/\s+/g, '').trim();
        const training = parseInt(trainingText || '0') || 0;
        
        // Extract "Outros" - try multiple selectors
        let otherInput = $row.find('input.underline-input[type="number"]').first();
        if (!otherInput.length) {
          otherInput = $row.find('input[type="number"]').first();
        }
        let otherValue = '';
        if (otherInput.length) {
          otherValue = String(otherInput.val() || otherInput.attr('value') || '').trim();
        }
        const other = parseInt(otherValue || '0') || 0;
        
        // Extract bonus from h3.skill-bonus
        let bonusEl = $row.find('h3.skill-bonus').first();
        if (!bonusEl.length) {
          bonusEl = $row.find('[class*="skill-bonus"]').first();
        }
        let bonus = 0;
        if (bonusEl.length) {
          const bonusText = bonusEl.text().trim();
          const bonusMatch = bonusText.match(/\(?\s*(\d+)\s*\)?/);
          if (bonusMatch) {
            bonus = parseInt(bonusMatch[1]) || 0;
          }
        }
        
        const total = training + other + bonus;
        
        console.log(`[CRIS Import] Skill: ${skillName}, training: ${training}, other: ${other}, bonus: ${bonus}, total: ${total}`);
        
        // Include skill if it has any value
        if (total > 0 || training > 0) {
          skills.push({
            name: skillName,
            base: training,
            bonus: other + bonus,
            total: total,
          });
        }
      });
      
      console.log(`[CRIS Import] Extracted ${skills.length} skills`);
    }

    const characterData: CharacterData = {
      name: name.trim() || 'Personagem Importado',
      attributes: {
        FOR: Math.max(1, Math.min(5, attributes.FOR || 1)),
        AGI: Math.max(1, Math.min(5, attributes.AGI || 1)),
        INT: Math.max(1, Math.min(5, attributes.INT || 1)),
        VIG: Math.max(1, Math.min(5, attributes.VIG || 1)),
        PRE: Math.max(1, Math.min(5, attributes.PRE || 1)),
      },
      skills: skills.map(skill => ({
        name: skill.name || 'Perícia Sem Nome',
        base: Math.max(0, skill.base || 0),
        bonus: Math.max(0, skill.bonus || 0),
        total: Math.max(0, skill.total || (skill.base || 0) + (skill.bonus || 0)),
      })),
    };

    console.log('[CRIS Import] Success!', {
      name: characterData.name,
      attributes: characterData.attributes,
      skillsCount: characterData.skills.length,
    });

    return res.status(200).json(characterData);
    
  } catch (error: any) {
    console.error('[CRIS Import] Error:', error);
    
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('[CRIS Import] Error closing browser:', e);
      }
    }
    
    let errorMessage = 'Failed to extract data from C.R.I.S.';
    let errorDetails = error?.message || 'Unknown error';
    
    if (error?.message?.includes('libnss3.so') || error?.message?.includes('shared object file')) {
      errorMessage = 'Erro de configuração do Chromium no Vercel';
      errorDetails = 'O Chromium não consegue iniciar. Configure BROWSERLESS_TOKEN no Vercel para usar serviço externo como fallback.';
    }
    
    return res.status(500).json({ 
      error: errorMessage,
      details: errorDetails,
    });
  }
}
