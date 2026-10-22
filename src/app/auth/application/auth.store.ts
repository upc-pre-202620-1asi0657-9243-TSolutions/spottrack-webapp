import { computed, inject, Injectable, Injector, signal } from '@angular/core';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthApiService } from '../infrastructure/auth-api.service';
import { ProfileApiService } from '../infrastructure/profile-api.service';
import { ActiveGymStore } from './active-gym.store';
import { AdminGymStore } from '../../gym/application/admin-gym.store';
import { AnalyticsStore } from '../../analytics/application/analytics.store';
import { FinancialImpactStore } from '../../analytics/application/financial-impact.store';
import { AlertsStore } from '../../alerts/application/alerts.store';
import { User, UserRole } from '../domain/model/user.model';

const TOKEN_KEY   = 'spottrack_token';
const USER_KEY    = 'spottrack_user';
const PENDING_KEY = 'spottrack_pending_business';

export interface RegisterData {
  firstName:   string;
  lastName:    string;
  dni:         string;
  phoneNumber: string;
  email:       string;
  password:    string;
}

// Holds form data between /register and /register/plans for the business path.
// Stored in sessionStorage so it survives the Stripe redirect round-trip on cancel.
export interface BusinessRegistrationDraft {
  firstName:   string;
  lastName:    string;
  dni:         string;
  phoneNumber: string;
  email:       string;
  password:    string;
  companyName:  string;
  ruc:          string;
  legalType:    string;
  companyPhone: string;
  companyEmail: string;
  street:       string;
  city:         string;
  district:     string;
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api           = inject(AuthApiService);
  private readonly profileApi    = inject(ProfileApiService);
  private readonly router        = inject(Router);
  // None of these stores inject AuthStore, so there is no circular dependency.
  private readonly activeGymStore        = inject(ActiveGymStore);
  private readonly adminGymStore         = inject(AdminGymStore);
  private readonly analyticsStore        = inject(AnalyticsStore);
  private readonly financialImpactStore  = inject(FinancialImpactStore);
  // AlertsService's constructor eagerly fires an HTTP call, whose interceptor
  // injects AuthStore — eagerly injecting AlertsStore here (like the stores
  // above) would construct it mid-way through AuthStore's own construction,
  // triggering NG0200. Resolve it lazily instead, only when actually needed.
  private readonly injector = inject(Injector);

  private readonly userSignal  = signal<User | null>(this.loadUser());
  private readonly tokenSignal = signal<string | null>(
    localStorage.getItem(TOKEN_KEY)
  );
  private readonly errorSignal           = signal<string | null>(null);
  private readonly registerErrorSignal   = signal<string | null>(null);
  private readonly registerLoadingSignal = signal(false);

  private readonly pendingBusinessDataSignal    = signal<BusinessRegistrationDraft | null>(this.loadPendingBusiness());
  private readonly pendingBusinessLoadingSignal = signal(false);
  private readonly pendingBusinessErrorSignal   = signal<string | null>(null);

  readonly currentUser      = this.userSignal.asReadonly();
  readonly token            = this.tokenSignal.asReadonly();
  readonly loginError       = this.errorSignal.asReadonly();
  readonly registerError    = this.registerErrorSignal.asReadonly();
  readonly registerLoading  = this.registerLoadingSignal.asReadonly();
  readonly isAuthenticated  = computed(() => this.tokenSignal() !== null);
  readonly isAdmin          = computed(() => this.userSignal()?.role === UserRole.ADMIN);
  readonly isClient         = computed(() => this.userSignal()?.role === UserRole.CLIENT);

  readonly pendingBusinessData    = this.pendingBusinessDataSignal.asReadonly();
  readonly pendingBusinessLoading = this.pendingBusinessLoadingSignal.asReadonly();
  readonly pendingBusinessError   = this.pendingBusinessErrorSignal.asReadonly();

  login(email: string, password: string): void {
    if (!email.trim() || !password.trim()) {
      this.errorSignal.set('auth.error.emptyFields');
      return;
    }
    this.api.signIn({ username: email.trim(), password }).subscribe({
      next: res => {
        // Token must be set before the next call so the JWT interceptor attaches it
        this.tokenSignal.set(res.token);
        localStorage.setItem(TOKEN_KEY, res.token);
        this.errorSignal.set(null);

        this.api.getUser(res.id).subscribe({
          next: details => {
            const raw     = details.roles?.[0] ?? details.role ?? '';
            const roleStr = String(raw).toUpperCase();
            const role    = roleStr.includes('ADMIN') ? UserRole.ADMIN : UserRole.CLIENT;
            const user: User = { id: res.id, email: res.username, name: res.username, role };
            this.userSignal.set(user);
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            if (role === UserRole.CLIENT) {
              this.activeGymStore.loadAssociations();
            } else {
              this.adminGymStore.load();
            }
            this.router.navigate([role === UserRole.ADMIN ? '/dashboard' : '/map']);
          },
          error: () => {
            // getUser failed — clear session and show error
            this.tokenSignal.set(null);
            localStorage.removeItem(TOKEN_KEY);
            this.errorSignal.set('auth.error.invalidCredentials');
          },
        });
      },
      error: () => this.errorSignal.set('auth.error.invalidCredentials'),
    });
  }

  // Client registration only. Business registration goes through
  // stageBusinessRegistration() + registerBusiness() instead.
  register(data: RegisterData): void {
    this.registerErrorSignal.set(null);
    this.registerLoadingSignal.set(true);

    this.api.signUp({ username: data.email.trim(), password: data.password }).pipe(
      switchMap(() => this.api.signIn({ username: data.email.trim(), password: data.password }))
    ).subscribe({
      next: res => {
        // Token must be set before the next call so the JWT interceptor attaches it
        this.tokenSignal.set(res.token);
        localStorage.setItem(TOKEN_KEY, res.token);

        // sign-up auto-creates a blank Client profile server-side (RoleAssignedEventHandler),
        // so we update rather than create here.
        this.profileApi.updateClientProfile({
          firstName:   data.firstName.trim(),
          lastName:    data.lastName.trim(),
          phoneNumber: data.phoneNumber.trim(),
          dni:         data.dni.trim(),
        }).subscribe({
          next: () => {
            const user: User = {
              id:    res.id,
              email: res.username,
              name:  `${data.firstName.trim()} ${data.lastName.trim()}`,
              role:  UserRole.CLIENT,
            };
            this.userSignal.set(user);
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            this.registerLoadingSignal.set(false);
            this.router.navigate(['/map']);
          },
          error: () => {
            this.registerLoadingSignal.set(false);
            this.registerErrorSignal.set('auth.error.profileFailed');
          },
        });
      },
      error: err => {
        this.registerLoadingSignal.set(false);
        this.registerErrorSignal.set(
          err?.status === 409 || err?.status === 400
            ? 'auth.error.emailTaken'
            : 'auth.error.registerFailed'
        );
      },
    });
  }

  // Step 1 of business registration: persist form data and navigate to plan selection.
  // Using sessionStorage so the draft survives a Stripe cancel redirect and the user
  // can retry without re-filling the entire form.
  stageBusinessRegistration(draft: BusinessRegistrationDraft): void {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(draft));
    this.pendingBusinessDataSignal.set(draft);
    this.pendingBusinessErrorSignal.set(null);
    this.router.navigate(['/register/plans']);
  }

  // Step 2 of business registration: send everything to POST /register-business in one shot,
  // then hand off to Stripe. Account is created by webhook after payment is confirmed.
  registerBusiness(tier: 'BASIC' | 'MID' | 'PLATINUM'): void {
    const draft = this.pendingBusinessDataSignal();
    if (!draft) {
      this.router.navigate(['/register']);
      return;
    }

    this.pendingBusinessLoadingSignal.set(true);
    this.pendingBusinessErrorSignal.set(null);

    this.api.registerBusiness({
      email:          draft.email.trim(),
      password:       draft.password,
      firstName:      draft.firstName.trim(),
      lastName:       draft.lastName.trim(),
      phoneNumber:    draft.phoneNumber.trim(),
      dni:            draft.dni.trim(),
      companyName:    draft.companyName.trim(),
      ruc:            draft.ruc.trim(),
      legalStructure: draft.legalType,
      companyPhone:   draft.companyPhone.trim(),
      companyEmail:   draft.companyEmail.trim(),
      streetAddress:  draft.street.trim(),
      city:           draft.city.trim(),
      district:       draft.district.trim(),
      membershipTier: tier,
    }).subscribe({
      next: ({ checkoutUrl }) => {
        sessionStorage.removeItem(PENDING_KEY);
        this.pendingBusinessDataSignal.set(null);
        this.pendingBusinessLoadingSignal.set(false);
        window.location.href = checkoutUrl;
      },
      error: err => {
        this.pendingBusinessLoadingSignal.set(false);
        this.pendingBusinessErrorSignal.set(
          err?.status === 409 ? 'auth.error.emailTaken' : 'auth.error.registerFailed'
        );
      },
    });
  }

  // Called by httpErrorInterceptor on 401 with an active token.
  // Sets the login-page banner key and clears auth state WITHOUT navigating —
  // the interceptor owns the redirect so there is no double navigation.
  handleExpiredSession(): void {
    this.userSignal.set(null);
    this.tokenSignal.set(null);
    this.errorSignal.set('auth.error.sessionExpired');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  clearRegisterError(): void        { this.registerErrorSignal.set(null); }
  clearPendingBusinessError(): void { this.pendingBusinessErrorSignal.set(null); }

  logout(): void {
    this.activeGymStore.reset();
    this.adminGymStore.reset();
    this.analyticsStore.reset();
    this.financialImpactStore.reset();
    this.injector.get(AlertsStore).reset();
    this.userSignal.set(null);
    this.tokenSignal.set(null);
    this.errorSignal.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.router.navigate(['/login']);
  }

  clearError(): void { this.errorSignal.set(null); }

  private loadUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch { return null; }
  }

  private loadPendingBusiness(): BusinessRegistrationDraft | null {
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      return raw ? (JSON.parse(raw) as BusinessRegistrationDraft) : null;
    } catch { return null; }
  }
}
