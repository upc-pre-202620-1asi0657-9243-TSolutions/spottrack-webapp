import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { AuthStore } from '../../../application/auth.store';
import { MembershipTier, PLAN_FEATURES } from '../../../../shared/application/plan-features.data';

interface PlanCard {
  key:      string;
  tier:     MembershipTier;
  price:    number;
  popular:  boolean;
  features: string[];
}

@Component({
  selector: 'app-plan-selection',
  standalone: true,
  imports: [TranslateModule, MatIconModule],
  templateUrl: './plan-selection.html',
  styleUrl:    './plan-selection.scss',
})
export class PlanSelectionComponent implements OnInit {
  private auth   = inject(AuthStore);
  private router = inject(Router);

  selectedKey = 'basic';

  // Getters delegate to store signals so the existing template bindings need no changes.
  get loadingPlan(): boolean       { return this.auth.pendingBusinessLoading(); }
  get errorMsg():    string | null { return this.auth.pendingBusinessError(); }

  readonly plans: PlanCard[] = [
    { key: 'basic',    tier: 'BASIC',    price: 69,  popular: false, features: PLAN_FEATURES['BASIC'] },
    { key: 'mid',      tier: 'MID',      price: 109, popular: true,  features: PLAN_FEATURES['MID'] },
    { key: 'platinum', tier: 'PLATINUM', price: 189, popular: false, features: PLAN_FEATURES['PLATINUM'] },
  ];

  ngOnInit(): void {
    // Redirect back to registration if no draft is present (direct navigation or lost sessionStorage).
    if (!this.auth.pendingBusinessData()) {
      this.router.navigate(['/register']);
    }
  }

  get selectedPlan(): PlanCard {
    return this.plans.find(p => p.key === this.selectedKey) ?? this.plans[0];
  }

  selectPlan(key: string): void {
    this.selectedKey = key;
    this.auth.clearPendingBusinessError();
  }

  proceedToPayment(): void {
    if (this.loadingPlan) return;
    this.auth.registerBusiness(this.selectedPlan.tier);
  }
}
