import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NoteService, Note, Category } from './services/note.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  notes: Note[] = [];
  filteredNotes: Note[] = [];
  selectedNote: Note | null = null;
  searchQuery: string = '';
  categories: Category[] = [];
  allTags: string[] = [];
  selectedCategory: string = '';
  selectedTags: string[] = [];
  tagInput: string = '';
  tagSuggestions: string[] = [];
  showTagSuggestions: boolean = false;
  currentLanguage: string = 'en';
  translations: any;

  constructor(private noteService: NoteService) {
    this.categories = this.noteService.categories;
  }

  ngOnInit() {
    this.noteService.getNotes().subscribe(notes => {
      this.notes = notes;
      this.filterNotes();
    });

    this.noteService.getTags().subscribe(tags => {
      this.allTags = tags;
    });

    this.updateLanguageStrings();
  }

  createNewNote() {
    const newNote = this.noteService.createNote();
    this.selectNote(newNote);
  }

  selectNote(note: Note) {
    this.selectedNote = note;
  }

  saveNote() {
    if (this.selectedNote) {
      this.noteService.updateNote(this.selectedNote);
    }
  }

  deleteNote(note: Note) {
    if (confirm('Are you sure you want to delete this note?')) {
      this.noteService.deleteNote(note.id);
      if (this.selectedNote?.id === note.id) {
        this.selectedNote = null;
      }
    }
  }

  toggleFavorite(note: Note) {
    note.isFavorite = !note.isFavorite;
    this.noteService.updateNote(note);
  }

  filterNotes() {
    let filtered = [...this.notes];

    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(query) || 
        note.content.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (this.selectedCategory) {
      filtered = filtered.filter(note => note.category === this.selectedCategory);
    }

    // Filter by tags
    if (this.selectedTags.length > 0) {
      filtered = filtered.filter(note => 
        this.selectedTags.every(tag => note.tags.includes(tag))
      );
    }

    this.filteredNotes = filtered;
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
      }
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return d.toLocaleDateString();
    }
  }

  getLastEditedDate(): string {
    if (this.notes.length === 0) return 'No notes';
    const lastNote = [...this.notes].sort((a, b) => 
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    )[0];
    return this.formatDate(lastNote.lastModified);
  }

  getWordCount(): number {
    if (!this.selectedNote?.content) return 0;
    return this.selectedNote.content.trim().split(/\s+/).length;
  }

  copyToClipboard() {
    if (!this.selectedNote) return;
    const text = `${this.selectedNote.title}\n\n${this.selectedNote.content}`;
    navigator.clipboard.writeText(text).then(() => {
      // You could add a toast notification here
      console.log('Note copied to clipboard');
    });
  }

  downloadNote() {
    if (!this.selectedNote) return;
    const text = `${this.selectedNote.title}\n\n${this.selectedNote.content}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.selectedNote.title || 'Untitled'}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  formatText(format: string) {
    // This is a basic implementation. You might want to use a rich text editor library
    const textarea = document.querySelector('.note-content-input') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let formattedText = '';

    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'underline':
        formattedText = `_${selectedText}_`;
        break;
    }

    if (this.selectedNote) {
      this.selectedNote.content = 
        textarea.value.substring(0, start) + 
        formattedText + 
        textarea.value.substring(end);
      this.saveNote();
    }
  }

  addList(type: 'bullet' | 'number') {
    if (!this.selectedNote) return;
    const textarea = document.querySelector('.note-content-input') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const prefix = type === 'bullet' ? '- ' : '1. ';
    
    this.selectedNote.content = 
      textarea.value.substring(0, start) + 
      '\n' + prefix + 
      textarea.value.substring(start);
    this.saveNote();
  }

  addLink() {
    if (!this.selectedNote) return;
    const url = prompt('Enter URL:');
    if (!url) return;

    const textarea = document.querySelector('.note-content-input') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const linkText = selectedText || 'link text';
    
    this.selectedNote.content = 
      textarea.value.substring(0, start) + 
      `[${linkText}](${url})` + 
      textarea.value.substring(end);
    this.saveNote();
  }

  addImage() {
    if (!this.selectedNote) return;
    const url = prompt('Enter image URL:');
    if (!url) return;

    const textarea = document.querySelector('.note-content-input') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    this.selectedNote.content = 
      textarea.value.substring(0, start) + 
      `![Image](${url})` + 
      textarea.value.substring(start);
    this.saveNote();
  }

  updateCategory(note: Note, category: string) {
    this.noteService.updateNoteCategory(note, category);
  }

  // Tag management
  onTagInput() {
    if (this.tagInput.includes(',')) {
      const tags = this.tagInput.split(',');
      const newTag = tags[0].trim();
      if (newTag && this.selectedNote && !this.selectedNote.tags.includes(newTag)) {
        this.selectedNote.tags.push(newTag);
        this.noteService.updateNote(this.selectedNote);
      }
      this.tagInput = tags[1] || '';
    } else {
      this.tagSuggestions = this.noteService.getTagSuggestions(this.tagInput);
      this.showTagSuggestions = this.tagSuggestions.length > 0;
    }
  }

  selectTagSuggestion(tag: string) {
    if (this.selectedNote && !this.selectedNote.tags.includes(tag)) {
      this.selectedNote.tags.push(tag);
      this.noteService.updateNote(this.selectedNote);
    }
    this.tagInput = '';
    this.showTagSuggestions = false;
  }

  removeTag(note: Note, tag: string) {
    note.tags = note.tags.filter(t => t !== tag);
    this.noteService.updateNote(note);
  }

  toggleTagFilter(tag: string) {
    const index = this.selectedTags.indexOf(tag);
    if (index === -1) {
      this.selectedTags.push(tag);
    } else {
      this.selectedTags.splice(index, 1);
    }
    this.filterNotes();
  }

  toggleCategoryFilter(category: string) {
    this.selectedCategory = this.selectedCategory === category ? '' : category;
    this.filterNotes();
  }

  clearFilters() {
    this.selectedCategory = '';
    this.selectedTags = [];
    this.searchQuery = '';
    this.filterNotes();
  }

  getCategoryColor(categoryName: string): string {
    const category = this.categories.find(c => c.name === categoryName);
    return category ? category.color : this.categories[0].color;
  }

  toggleLanguage() {
    this.currentLanguage = this.currentLanguage === 'en' ? 'pl' : 'en';
    this.updateLanguageStrings();
  }

  updateLanguageStrings() {
    if (this.currentLanguage === 'pl') {
      // Polish translations
      this.translations = {
        searchPlaceholder: 'Szukaj notatek...',
        clearFilters: 'Wyczyść filtry',
        categories: 'Kategorie',
        tags: 'Tagi',
        newNote: 'Nowa notatka',
        notes: 'notatek',
        lastEdited: 'Ostatnio edytowane',
        untitled: 'Bez tytułu',
        noteTitlePlaceholder: 'Tytuł notatki',
        addTags: 'Dodaj tagi (oddzielone przecinkami)...',
        noNoteSelected: 'Nie wybrano notatki',
        selectNotePrompt: 'Wybierz notatkę z listy lub utwórz nową, aby rozpocząć.',
        createNewNote: 'Utwórz nową notatkę',
        words: 'słów',
        lastSaved: 'Ostatnio zapisano',
        categoryNames: {
          'Personal': 'Osobiste',
          'Work': 'Praca',
          'Study': 'Nauka',
          'Ideas': 'Pomysły',
          'Tasks': 'Zadania',
          'Other': 'Inne'
        }
      };
    } else {
      // English translations
      this.translations = {
        searchPlaceholder: 'Search notes...',
        clearFilters: 'Clear filters',
        categories: 'Categories',
        tags: 'Tags',
        newNote: 'New Note',
        notes: 'notes',
        lastEdited: 'Last edited',
        untitled: 'Untitled',
        noteTitlePlaceholder: 'Note Title',
        addTags: 'Add tags (comma-separated)...',
        noNoteSelected: 'No Note Selected',
        selectNotePrompt: 'Select a note from the list or create a new one to get started.',
        createNewNote: 'Create New Note',
        words: 'words',
        lastSaved: 'Last saved',
        categoryNames: {
          'Personal': 'Personal',
          'Work': 'Work',
          'Study': 'Study',
          'Ideas': 'Ideas',
          'Tasks': 'Tasks',
          'Other': 'Other'
        }
      };
    }
  }

  getTranslatedCategory(categoryName: string): string {
    return this.translations.categoryNames[categoryName] || categoryName;
  }
}
