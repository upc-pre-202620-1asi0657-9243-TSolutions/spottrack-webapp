import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { MembershipStore } from '../../../application/membership.store';
import { PLAN_FEATURES } from '../../../../shared/application/plan-features.data';

@Component({
  selector: 'app-membership-list',
  standalone: true,
  imports: [FormsModule, MatIconModule, TranslateModule],
  templateUrl: './membership-list.component.html',
  styleUrl:    './membership-list.component.css',
})
export class MembershipListComponent implements OnInit {
  readonly store = inject(MembershipStore);

  readonly lifecycleLoading  = this.store.lifecycleLoading;
  readonly lifecycleError    = this.store.lifecycleError;
  readonly membershipLoading = this.store.membershipLoading;

  readonly tiers = ['BASIC', 'MID', 'PLATINUM'] as const;

  readonly upgradeTierTarget     = signal('');
  readonly downgradeTierTarget   = signal('');
  readonly resubscribeTierTarget = signal('BASIC');

  readonly currentTierIndex = computed(() => {
    const tier = this.store.myMembership()?.membershipTier ?? '';
    return this.tiers.indexOf(tier as typeof this.tiers[number]);
  });

  readonly upgradeOptions = computed(() =>
    this.currentTierIndex() >= 0 ? Array.from(this.tiers).slice(this.currentTierIndex() + 1) : []
  );

  readonly downgradeOptions = computed(() =>
    this.currentTierIndex() > 0 ? Array.from(this.tiers).slice(0, this.currentTierIndex()) : []
  );

  constructor() {
    // Initialize selectors to sensible defaults once the membership resolves.
    // Guards prevent re-overwriting after the user makes a selection.
    effect(() => {
      const opts = this.upgradeOptions();
      if (opts.length > 0 && !this.upgradeTierTarget()) this.upgradeTierTarget.set(opts[0]);
    });
    effect(() => {
      const opts = this.downgradeOptions();
      if (opts.length > 0 && !this.downgradeTierTarget()) this.downgradeTierTarget.set(opts[opts.length - 1]);
    });
  }

  ngOnInit(): void {
    this.store.loadMyMembership();
  }

  cancelMembership(): void {
    if (confirm('¿Cancelar la membresía? Seguirá activa hasta fin del período de facturación.')) {
      this.store.cancel();
    }
  }

  undoCancel(): void { this.store.undoCancel(); }

  payDebt(): void    { this.store.payDebt(); }
  upgradePlan(): void  { if (this.upgradeTierTarget())   this.store.upgradePlan(this.upgradeTierTarget()); }
  downgradePlan(): void { if (this.downgradeTierTarget()) this.store.downgradePlan(this.downgradeTierTarget()); }
  resubscribe(): void   { if (this.resubscribeTierTarget()) this.store.resubscribe(this.resubscribeTierTarget()); }

  featuresFor(tier: string): string[] {
    return PLAN_FEATURES[tier as keyof typeof PLAN_FEATURES] ?? [];
  }

}
