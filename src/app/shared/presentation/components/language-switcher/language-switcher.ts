import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

export interface Language {
  code: string;
  name: string;
}

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule, MatMenuModule, MatButtonModule],
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.css',
})
export class LanguageSwitcher {
  languages: Language[] = [
    { code: 'es', name: 'Español' },
    { code: 'en', name: 'English' },
  ];

  currentLang: Language = this.languages[0];

  constructor(private translate: TranslateService) {
    const activeLangCode = this.translate.currentLang || this.translate.getDefaultLang() || 'en';
    const foundLang = this.languages.find((l) => l.code === activeLangCode);
    if (foundLang) {
      this.currentLang = foundLang;
    }
  }

  useLanguage(language: Language) {
    this.currentLang = language;
    this.translate.use(language.code);
  }
}
