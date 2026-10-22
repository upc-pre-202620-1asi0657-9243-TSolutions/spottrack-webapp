import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { PasswordStore } from '../../../application/password.store';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink, MatIconModule, TranslateModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPasswordComponent {
  readonly store = inject(PasswordStore);

  email       = '';
  dni         = '';
  newPassword = '';
  confirmPassword = '';
  pwdMatchError   = signal(false);

  constructor() {
    this.store.resetForgotPassword();
  }

  submitStep1(): void {
    if (!this.email.trim()) return;
    this.store.sendForgotPassword(this.email.trim());
  }

  submitStep2(): void {
    if (this.newPassword !== this.confirmPassword) {
      this.pwdMatchError.set(true);
      return;
    }
    this.pwdMatchError.set(false);
    this.store.verifyForgotPassword(this.email || this.store.fpEmail(), this.dni.trim(), this.newPassword);
  }
}
