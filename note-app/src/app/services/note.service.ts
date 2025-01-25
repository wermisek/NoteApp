import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

export interface Note {
  id: string;
  title: string;
  content: string;
  lastModified: Date;
  isFavorite: boolean;
  tags: string[];
  category: string;
  color: string;
}

export interface Category {
  name: string;
  color: string;
}

@Injectable({
  providedIn: 'root'
})
export class NoteService {
  private notes: Note[] = [];
  private notesSubject = new BehaviorSubject<Note[]>([]);
  private isBrowser: boolean;

  // Predefined categories with colors
  readonly categories: Category[] = [
    { name: 'Personal', color: '#60A5FA' },    // Blue
    { name: 'Work', color: '#34D399' },        // Green
    { name: 'Study', color: '#F472B6' },       // Pink
    { name: 'Ideas', color: '#A78BFA' },       // Purple
    { name: 'Tasks', color: '#FBBF24' },       // Yellow
    { name: 'Projects', color: '#F87171' }     // Red
  ];

  private allTags = new Set<string>();
  private tagsSubject = new BehaviorSubject<string[]>([]);

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    if (this.isBrowser) {
      // Load notes from localStorage only in browser environment
      const savedNotes = localStorage.getItem('notes');
      if (savedNotes) {
        this.notes = JSON.parse(savedNotes).map((note: any) => ({
          ...note,
          lastModified: new Date(note.lastModified),
          tags: note.tags || [],
          category: note.category || 'Personal',
          color: note.color || this.categories[0].color
        }));
        this.updateAllTags();
        this.notesSubject.next(this.notes);
      }
    }
  }

  getNotes(): Observable<Note[]> {
    return this.notesSubject.asObservable();
  }

  getTags(): Observable<string[]> {
    return this.tagsSubject.asObservable();
  }

  createNote(): Note {
    const newNote: Note = {
      id: Date.now().toString(),
      title: '',
      content: '',
      lastModified: new Date(),
      isFavorite: false,
      tags: [],
      category: 'Personal',
      color: this.categories[0].color
    };
    this.notes.unshift(newNote);
    this.saveNotes();
    return newNote;
  }

  updateNote(note: Note): void {
    const index = this.notes.findIndex(n => n.id === note.id);
    if (index !== -1) {
      this.notes[index] = { 
        ...note, 
        lastModified: new Date(),
        tags: [...new Set(note.tags)] // Remove duplicates
      };
      this.updateAllTags();
      this.saveNotes();
    }
  }

  deleteNote(noteId: string): void {
    this.notes = this.notes.filter(note => note.id !== noteId);
    this.updateAllTags();
    this.saveNotes();
  }

  updateNoteCategory(note: Note, category: string): void {
    const categoryObj = this.categories.find(c => c.name === category);
    if (categoryObj) {
      note.category = category;
      note.color = categoryObj.color;
      this.updateNote(note);
    }
  }

  private updateAllTags(): void {
    this.allTags.clear();
    this.notes.forEach(note => {
      note.tags.forEach(tag => this.allTags.add(tag));
    });
    this.tagsSubject.next([...this.allTags].sort());
  }

  getTagSuggestions(query: string): string[] {
    const lowercaseQuery = query.toLowerCase();
    return [...this.allTags]
      .filter(tag => tag.toLowerCase().includes(lowercaseQuery))
      .sort();
  }

  private saveNotes(): void {
    if (this.isBrowser) {
      localStorage.setItem('notes', JSON.stringify(this.notes));
    }
    this.notesSubject.next(this.notes);
  }
} 