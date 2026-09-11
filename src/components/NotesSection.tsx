import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { guestGet, guestSet, guestId, guestNow, GUEST_USER_ID } from '@/lib/guestStorage';

interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  campaign: string | null;
  created_at: string;
  updated_at: string;
}

export function NotesSection() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftCampaign, setDraftCampaign] = useState('');

  const loadNotes = () => {
    const stored = guestGet<Note[]>('notes', []);
    const sorted = [...stored].sort(
      (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    );
    setNotes(sorted);
    return sorted;
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const persist = (next: Note[]) => {
    guestSet('notes', next);
    setNotes(next);
  };

  const handleCreate = () => {
    const now = guestNow();
    const note: Note = {
      id: guestId(),
      user_id: GUEST_USER_ID,
      title: 'Nova Nota',
      content: '',
      campaign: null,
      created_at: now,
      updated_at: now,
    };
    const next = [note, ...notes];
    persist(next);
    setSelectedNote(note);
    setDraftTitle(note.title);
    setDraftContent(note.content);
    setDraftCampaign('');
    setIsEditing(true);
  };

  const startEdit = () => {
    if (!selectedNote) return;
    setDraftTitle(selectedNote.title);
    setDraftContent(selectedNote.content);
    setDraftCampaign(selectedNote.campaign || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!selectedNote) return;
    const updated: Note = {
      ...selectedNote,
      title: draftTitle.trim() || 'Sem título',
      content: draftContent,
      campaign: draftCampaign.trim() || null,
      updated_at: guestNow(),
    };
    const next = notes.map((n) => (n.id === updated.id ? updated : n));
    persist(next);
    setSelectedNote(updated);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!selectedNote) return;
    if (!confirm('Tem certeza que deseja excluir esta nota?')) return;
    const next = notes.filter((n) => n.id !== selectedNote.id);
    persist(next);
    setSelectedNote(null);
    setIsEditing(false);
  };

  const selectNote = (note: Note) => {
    setSelectedNote(note);
    setIsEditing(false);
    setDraftTitle(note.title);
    setDraftContent(note.content);
    setDraftCampaign(note.campaign || '');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold glow-text">Minhas Notas</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:shadow-glow transition-all"
        >
          + Nova Nota
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1 space-y-2">
          {notes.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Nenhuma nota ainda. Crie a primeira.
            </div>
          ) : (
            notes.map((note) => (
              <button
                key={note.id}
                onClick={() => selectNote(note)}
                className={cn(
                  'w-full text-left p-4 rounded-xl transition-all duration-200',
                  selectedNote?.id === note.id
                    ? 'glass-card border-primary/50'
                    : 'bg-secondary/30 hover:bg-secondary/50 border border-transparent'
                )}
              >
                <h4 className="font-medium text-sm truncate">{note.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note.content || 'Sem conteúdo'}</p>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                  <span>📅 {new Date(note.created_at).toLocaleDateString('pt-BR')}</span>
                  {note.campaign && <span>📜 {note.campaign}</span>}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="md:col-span-2 glass-card p-6">
          {selectedNote ? (
            <div className="space-y-4">
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="w-full bg-transparent text-xl font-display font-semibold focus:outline-none border-b border-border pb-2"
                    placeholder="Título"
                  />
                  <input
                    type="text"
                    value={draftCampaign}
                    onChange={(e) => setDraftCampaign(e.target.value)}
                    className="w-full bg-secondary/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Campanha (opcional)"
                  />
                  <textarea
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    className="w-full h-64 bg-secondary/30 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Escreva sua nota..."
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 rounded-lg bg-secondary text-sm hover:bg-secondary/80 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:shadow-glow transition-all"
                    >
                      Salvar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={selectedNote.title}
                    className="w-full bg-transparent text-xl font-display font-semibold focus:outline-none border-b border-border pb-2"
                    readOnly
                  />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>📅 {new Date(selectedNote.created_at).toLocaleDateString('pt-BR')}</span>
                    {selectedNote.campaign && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                        {selectedNote.campaign}
                      </span>
                    )}
                  </div>
                  <textarea
                    value={selectedNote.content}
                    className="w-full h-64 bg-secondary/30 rounded-xl p-4 text-sm focus:outline-none resize-none"
                    readOnly
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={startEdit}
                      className="px-4 py-2 rounded-lg bg-secondary text-sm hover:bg-secondary/80 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm hover:opacity-80 transition-opacity"
                    >
                      Excluir
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
              <span className="text-4xl mb-3">📝</span>
              <p>Selecione uma nota para visualizar</p>
              <p className="text-sm">ou crie uma nova nota</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
