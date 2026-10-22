import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BranchResource {
  branchId: string;
  name:     string;
  address:  string | null;
}

export interface CreateBranchRequest {
  name:    string;
  address: string;
}

@Injectable({ providedIn: 'root' })
export class BranchApi {
  private readonly http = inject(HttpClient);

  getBranches(gymId: string): Observable<BranchResource[]> {
    return this.http.get<BranchResource[]>(
      `${environment.apiBase}/gyms/${gymId}/branches`
    );
  }

  createBranch(gymId: string, req: CreateBranchRequest): Observable<BranchResource> {
    return this.http.post<BranchResource>(
      `${environment.apiBase}/gyms/${gymId}/branches`,
      req
    );
  }
}
