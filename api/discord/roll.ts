// Vercel Serverless Function for Discord dice rolls
// This endpoint receives roll requests from the frontend and sends them to Discord
// Note: We use REST API directly instead of maintaining a persistent connection

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { REST, Routes, EmbedBuilder } from 'discord.js';
import { webcrypto } from 'crypto';

// Use webcrypto for browser-compatible crypto API
const crypto = webcrypto as Crypto;

// Parse roll formula like "2#d20+5" or "3#d20"
function parseRollFormula(formula: string): { diceCount: number; sides: number; modifier: number } {
  // Match patterns like "2#d20+5" or "3#d20" or "d20+3"
  const match = formula.match(/(\d+)?#?d(\d+)([+-]\d+)?/);
  
  if (!match) {
    throw new Error('Invalid roll formula');
  }
  
  const diceCount = match[1] ? parseInt(match[1]) : 1;
  const sides = parseInt(match[2]);
  const modifier = match[3] ? parseInt(match[3]) : 0;
  
  return { diceCount, sides, modifier };
}

// Generate cryptographically secure random number between 1 and sides
function secureRandomDice(sides: number): number {
  // Use crypto.getRandomValues for true randomness
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Convert to range [1, sides]
  return (array[0] % sides) + 1;
}

// Roll dice - for skills, take the highest roll, not sum
function rollDice(count: number, sides: number, modifier: number, isSkill: boolean = true): { rolls: number[]; total: number; isCritical: boolean; isFumble: boolean } {
  const rolls: number[] = [];
  
  // Use cryptographically secure random for each die
  for (let i = 0; i < count; i++) {
    rolls.push(secureRandomDice(sides));
  }
  
  // For skills: take the highest roll + modifier
  // For combat/damage: sum all rolls + modifier
  const total = isSkill 
    ? Math.max(...rolls) + modifier 
    : rolls.reduce((a, b) => a + b, 0) + modifier;
  
  const isCritical = sides === 20 && rolls.includes(20);
  const isFumble = sides === 20 && rolls.includes(1);
  
  return { rolls, total, isCritical, isFumble };
}

// Format individual roll results
function formatRollResults(rolls: number[], sides: number, modifier: number): string {
  return rolls.map(roll => {
    const result = roll + modifier;
    const modifierText = modifier !== 0 ? (modifier > 0 ? ` + ${modifier}` : ` ${modifier}`) : '';
    return `**${result}** ⟵ [${roll}] 1d${sides}${modifierText}`;
  }).join('\n');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate environment variables
    if (!process.env.DISCORD_BOT_TOKEN) {
      return res.status(500).json({ error: 'Discord bot token not configured' });
    }

    if (!process.env.DISCORD_CHANNEL_ID) {
      return res.status(500).json({ error: 'Discord channel ID not configured' });
    }

    // Get request body
    const {
      characterName,
      skillName,
      attribute,
      rollFormula,
      isCombat = false,
    } = req.body;

    // Validate required fields
    if (!characterName || !skillName || !attribute || !rollFormula) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Parse roll formula
    const { diceCount, sides, modifier } = parseRollFormula(rollFormula);
    
    // Roll dice (skills use highest roll, combat sums all)
    const { rolls, total, isCritical, isFumble } = rollDice(diceCount, sides, modifier, !isCombat);

    // Use Discord REST API (no persistent connection needed)
    const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN!);
    
    // Get channel from environment variable
    const targetChannelId = process.env.DISCORD_CHANNEL_ID!;

    // Format roll results
    const rollResultsText = formatRollResults(rolls, sides, modifier);
    
    // Create embed message
    const embed = new EmbedBuilder()
      .setColor(isCritical ? 0x00ff00 : isFumble ? 0xff0000 : 0x0099ff)
      .setTitle(`${characterName} usou ${skillName} (${attribute})`)
      .addFields(
        { name: 'Fórmula', value: rollFormula, inline: false },
        { name: 'Rolagens', value: rollResultsText, inline: false },
        { name: 'Resultado Final', value: `**${total}**`, inline: false }
      )
      .setTimestamp();

    // Add critical/fumble indicators
    if (isCritical) {
      embed.addFields({ name: '🎯', value: '**CRÍTICO!**', inline: false });
    }
    
    if (isFumble) {
      embed.addFields({ name: '💥', value: '**FALHA CRÍTICA!**', inline: false });
    }

    // Send message to Discord using REST API
    await rest.post(Routes.channelMessages(targetChannelId), {
      body: {
        embeds: [embed.toJSON()],
      },
    });

    // Return success
    return res.status(200).json({
      success: true,
      roll: {
        rolls,
        total,
        isCritical,
        isFumble,
      },
    });

  } catch (error: any) {
    console.error('Discord roll error:', error);
    return res.status(500).json({
      error: 'Failed to send roll to Discord',
      message: error.message,
    });
  }
}

