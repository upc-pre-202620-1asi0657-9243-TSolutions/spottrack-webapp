import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { AuthStore } from '../../../application/auth.store';
import { LanguageSwitcher } from '../../../../shared/presentation/components/language-switcher/language-switcher';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const pw  = control.get('password');
  const cpw = control.get('confirmPassword');
  if (pw && cpw && pw.value !== cpw.value) return { passwordMismatch: true };
  return null;
}

const COMPANY_FIELD_NAMES = [
  'companyName', 'ruc', 'legalType', 'companyPhone', 'companyEmail', 'street', 'city', 'district',
] as const;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, MatIconModule, LanguageSwitcher],
  templateUrl: './register.html',
  styleUrl:    './register.scss',
})
export class RegisterComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthStore);
  private router = inject(Router);

  readonly registerError   = this.auth.registerError;
  readonly registerLoading = this.auth.registerLoading;

  readonly legalTypes = ['SAC', 'SRL', 'SA', 'EIRL'] as const;

  showPass        = false;
  showConfirmPass = false;
  accountType: 'client' | 'business' = 'client';

  form = this.fb.group(
    {
      firstName:       ['', [Validators.required, Validators.minLength(2)]],
      lastName:        ['', [Validators.required, Validators.minLength(2)]],
      dni:             ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      phoneNumber:     ['', [Validators.required, Validators.pattern(/^[0-9]{7,15}$/)]],
      email:           ['', [Validators.required, Validators.email]],
      password:        ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      companyName:     [''],
      ruc:             ['', Validators.pattern(/^[0-9]{11}$/)],
      legalType:       [''],
      companyPhone:    ['', Validators.pattern(/^[0-9]{7,15}$/)],
      companyEmail:    ['', Validators.email],
      street:          [''],
      city:            [''],
      district:        [''],
    },
    { validators: passwordsMatch }
  );

  get f() { return this.form.controls; }
  get isBusiness() { return this.accountType === 'business'; }

  selectAccountType(type: 'client' | 'business'): void {
    this.accountType = type;
    this.auth.clearRegisterError();

    for (const name of COMPANY_FIELD_NAMES) {
      const control = this.form.get(name)!;
      if (type === 'business') {
        control.addValidators(Validators.required);
      } else {
        control.removeValidators(Validators.required);
      }
      control.updateValueAndValidity();
    }
  }

  onInputChange(): void {
    this.auth.clearRegisterError();
  }

  onSubmit(): void {
    if (this.form.invalid || this.registerLoading()) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();

    if (this.isBusiness) {
      this.auth.stageBusinessRegistration({
        firstName:    v.firstName!,
        lastName:     v.lastName!,
        dni:          v.dni!,
        phoneNumber:  v.phoneNumber!,
        email:        v.email!,
        password:     v.password!,
        companyName:  v.companyName!,
        ruc:          v.ruc!,
        legalType:    v.legalType!,
        companyPhone: v.companyPhone!,
        companyEmail: v.companyEmail!,
        street:       v.street!,
        city:         v.city!,
        district:     v.district!,
      });
    } else {
      this.auth.register({
        firstName:   v.firstName!,
        lastName:    v.lastName!,
        dni:         v.dni!,
        phoneNumber: v.phoneNumber!,
        email:       v.email!,
        password:    v.password!,
      });
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
