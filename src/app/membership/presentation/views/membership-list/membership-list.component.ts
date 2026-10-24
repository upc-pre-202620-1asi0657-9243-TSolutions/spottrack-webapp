import { Component, computed, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MembershipStore } from '../../../application/membership.store';
import { BranchStore } from '../../../../gym/application/branch.store';
import { EquipmentStore } from '../../../../gym/application/equipment.store';
import {
  MembershipTier, PLAN_FEATURES, PLAN_LIMITS, PLAN_PRICES,
} from '../../../../shared/application/plan-features.data';

const TIERS: MembershipTier[] = ['BASIC', 'MID', 'PLATINUM'];

interface PlanOption {
  tier: MembershipTier;
  price: number;
  features: string[];
  relation: 'current' | 'upgrade' | 'downgrade';
}

interface UsageMeter {
  labelKey: string;
  used: number;
  limit: number | null;
  pct: number;
  nearLimit: boolean;
}

@Component({
  selector: 'app-membership-list',
  standalone: true,
  imports: [DatePipe, MatIconModule, TranslateModule],
  templateUrl: './membership-list.component.html',
  styleUrl:    './membership-list.component.css',
})
export class MembershipListComponent implements OnInit {
  readonly store = inject(MembershipStore);
  private readonly branchStore    = inject(BranchStore);
  private readonly equipmentStore = inject(EquipmentStore);
  private readonly translate      = inject(TranslateService);

  readonly lifecycleLoading  = this.store.lifecycleLoading;
  readonly lifecycleError    = this.store.lifecycleError;
  readonly membershipLoading = this.store.membershipLoading;

  readonly membership = this.store.myMembership;
  readonly tier = computed(() => (this.membership()?.membershipTier ?? null) as MembershipTier | null);
  readonly isActive = computed(() => this.membership()?.status === 'ACTIVE');

  /** All plans side by side, each marked against the current one. Inactive members see them all as options. */
  readonly plans = computed<PlanOption[]>(() => {
    const currentIndex = this.tier() && this.isActive() ? TIERS.indexOf(this.tier()!) : -1;
    return TIERS.map((tier, i) => ({
      tier,
      price: PLAN_PRICES[tier],
      features: PLAN_FEATURES[tier],
      relation: i === currentIndex ? 'current' : i > currentIndex ? 'upgrade' : 'downgrade',
    }));
  });

  readonly usage = computed<UsageMeter[]>(() => {
    const tier = this.tier();
    if (!tier) return [];
    const limits = PLAN_LIMITS[tier];
    const meter = (labelKey: string, used: number, limit: number | null): UsageMeter => ({
      labelKey, used, limit,
      pct: limit ? Math.min(100, Math.round((used / limit) * 100)) : 0,
      nearLimit: !!limit && used / limit >= 0.8,
    });
    return [
      meter('membership.usage.branches', this.branchStore.branches().length, limits.branches),
      meter('membership.usage.equipment', this.equipmentStore.equipment().length, limits.equipment),
    ];
  });

  ngOnInit(): void {
    this.store.loadMyMembership();
  }

  tierLabel(tier: string | null | undefined): string {
    return tier ? this.translate.instant('auth.plans.tier.' + tier.toLowerCase()) : '';
  }

  choosePlan(plan: PlanOption): void {
    if (!this.isActive()) {
      this.store.resubscribe(plan.tier);
    } else if (plan.relation === 'upgrade') {
      this.store.upgradePlan(plan.tier);
    } else if (plan.relation === 'downgrade') {
      this.store.downgradePlan(plan.tier);
    }
  }

  cancelMembership(): void {
    if (confirm(this.translate.instant('membership.lifecycle.cancelConfirm'))) {
      this.store.cancel();
    }
  }

  undoCancel(): void { this.store.undoCancel(); }
  payDebt(): void    { this.store.payDebt(); }
}
