import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MembershipPlanResource, BranchAccessResource, AdminMembershipResource } from './membership-response';

@Injectable({ providedIn: 'root' })
export class MembershipApi {
  private readonly base      = `${environment.apiBase}/memberships`;
  private readonly plansUrl  = `${environment.apiBase}/membership-plans`;
  private readonly accessUrl = `${environment.apiBase}/branch-access`;

  constructor(private readonly http: HttpClient) {}

  getPlans(): Observable<MembershipPlanResource[]> {
    return this.http.get<MembershipPlanResource[]>(this.plansUrl);
  }

  getPlanById(id: number): Observable<MembershipPlanResource> {
    return this.http.get<MembershipPlanResource>(`${this.plansUrl}/${id}`);
  }

  getBranchAccess(): Observable<BranchAccessResource[]> {
    return this.http.get<BranchAccessResource[]>(this.accessUrl);
  }

  getMyMembership(): Observable<AdminMembershipResource> {
    return this.http.get<AdminMembershipResource>(`${this.base}/me`);
  }

  cancel(membershipId: string): Observable<AdminMembershipResource> {
    return this.http.patch<AdminMembershipResource>(`${this.base}/${membershipId}/cancel`, {});
  }

  undoCancel(membershipId: string): Observable<AdminMembershipResource> {
    return this.http.patch<AdminMembershipResource>(`${this.base}/${membershipId}/undo-cancel`, {});
  }

  payDebt(membershipId: string): Observable<{ checkoutUrl: string }> {
    return this.http.post<{ checkoutUrl: string }>(`${this.base}/${membershipId}/pay-debt`, {});
  }

  upgradePlan(membershipId: string, newMembershipTier: string): Observable<{ checkoutUrl: string }> {
    return this.http.post<{ checkoutUrl: string }>(
      `${this.base}/${membershipId}/upgrade-plan`,
      { newMembershipTier }
    );
  }

  downgradePlan(membershipId: string, newMembershipTier: string): Observable<AdminMembershipResource> {
    return this.http.post<AdminMembershipResource>(
      `${this.base}/${membershipId}/downgrade-plan`,
      { newMembershipTier }
    );
  }

  resubscribe(membershipTier: string): Observable<{ checkoutUrl: string }> {
    return this.http.post<{ checkoutUrl: string }>(`${this.base}/resubscribe`, { membershipTier });
  }
}
