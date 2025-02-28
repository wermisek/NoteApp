import { Component, OnInit, Renderer2, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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
  isDarkTheme = false;
  private isBrowser: boolean;

  // New properties for header features
  sortMenuOpen: boolean = false;
  sortBy: 'date' | 'title' | 'category' = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';
  showStats: boolean = false;
  isSyncing: boolean = false;
  showFeaturesMenu: boolean = false;

  constructor(
    private noteService: NoteService,
    private renderer: Renderer2,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.categories = this.noteService.categories;
    this.isBrowser = isPlatformBrowser(platformId);
    
    // Load saved theme preference only in browser environment
    if (this.isBrowser) {
      const savedTheme = localStorage.getItem('theme');
      this.isDarkTheme = savedTheme === 'light' ? false : true; // Default to dark if not set
      this.applyTheme(this.isDarkTheme);
    }
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

  toggleTheme(event: MouseEvent) {
    this.isDarkTheme = !this.isDarkTheme;
    
    if (this.isBrowser) {
      // Store theme preference
      localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
      
      // Get click coordinates for the animation
      const x = event.clientX;
      const y = event.clientY;
      document.documentElement.style.setProperty('--theme-transition-top', `${y}px`);
      document.documentElement.style.setProperty('--theme-transition-left', `${x}px`);
      
      // Add animation class to body
      this.renderer.addClass(document.body, 'theme-transition');
      
      // Apply theme after a small delay to ensure animation starts
      setTimeout(() => {
        if (!this.isDarkTheme) {
          this.renderer.addClass(document.body, 'light-theme');
        } else {
          this.renderer.removeClass(document.body, 'light-theme');
        }
      }, 50);
      
      // Remove transition class after animation
      setTimeout(() => {
        this.renderer.removeClass(document.body, 'theme-transition');
      }, 1000);
    }
  }

  private applyTheme(isDark: boolean) {
    if (this.isBrowser) {
      if (!isDark) {
        this.renderer.addClass(document.body, 'light-theme');
      } else {
        this.renderer.removeClass(document.body, 'light-theme');
      }
    }
  }

  // Header feature functions
  toggleFeaturesMenu() {
    this.showFeaturesMenu = !this.showFeaturesMenu;
    if (!this.showFeaturesMenu) {
      this.sortMenuOpen = false;
      this.showStats = false;
    }
  }

  toggleSortMenu(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.sortMenuOpen = !this.sortMenuOpen;
    this.showStats = false;
  }

  toggleStats(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.showStats = !this.showStats;
    this.sortMenuOpen = false;
  }

  syncNotes() {
    if (this.isSyncing) return;
    
    this.isSyncing = true;
    const syncBtn = document.querySelector('.sync-btn i');
    if (syncBtn) {
      syncBtn.classList.add('syncing');
    }

    // Simulate sync process
    setTimeout(() => {
      this.isSyncing = false;
      if (syncBtn) {
        syncBtn.classList.remove('syncing');
      }
      // Here you would typically handle the actual sync logic
      console.log('Notes synced successfully');
    }, 2000);
  }

  // Sort functionality
  sortNotes(by: 'date' | 'title' | 'category') {
    this.sortBy = by;
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    
    this.filteredNotes.sort((a, b) => {
      let comparison = 0;
      switch (by) {
        case 'date':
          comparison = new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
          break;
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
      }
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  // Stats calculations
  getNoteStats() {
    const totalNotes = this.notes.length;
    const totalWords = this.notes.reduce((sum, note) => 
      sum + (note.content.trim().split(/\s+/).length || 0), 0);
    const categoryCounts = this.notes.reduce((acc, note) => {
      acc[note.category] = (acc[note.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const favoritesCount = this.notes.filter(note => note.isFavorite).length;

    return {
      totalNotes,
      totalWords,
      categoryCounts,
      favoritesCount
    };
  }
}
