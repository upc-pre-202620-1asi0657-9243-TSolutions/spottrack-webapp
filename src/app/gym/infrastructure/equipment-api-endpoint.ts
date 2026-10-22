import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Equipment } from '../domain/model/equipment.entity';
import { EquipmentResource, EquipmentResponse } from './equipment-response';
import { EquipmentAssembler } from './equipment-assembler';
import { environment } from '../../../environments/environment';

export class EquipmentApiEndpoint {
  private readonly url = `${environment.apiBase}/equipments`;
  private readonly assembler = new EquipmentAssembler();

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Equipment[]> {
    return this.http.get<EquipmentResponse | EquipmentResource[]>(this.url).pipe(
      map(response => Array.isArray(response)
        ? response.map(r => this.assembler.toEntityFromResource(r))
        : this.assembler.toEntitiesFromResponse(response as EquipmentResponse)),
      catchError(() => throwError(() => new Error('Failed to fetch equipment')))
    );
  }

  /** Gym-scoped list — the client-accessible endpoint, guarded by gym association on the backend. */
  getByGym(gymId: string): Observable<Equipment[]> {
    return this.http.get<EquipmentResponse | EquipmentResource[]>(
      `${environment.apiBase}/gyms/${gymId}/equipments`
    ).pipe(
      map(response => Array.isArray(response)
        ? response.map(r => this.assembler.toEntityFromResource(r))
        : this.assembler.toEntitiesFromResponse(response as EquipmentResponse)),
      catchError(() => throwError(() => new Error('Failed to fetch gym equipment')))
    );
  }

  create(entity: Equipment): Observable<Equipment> {
    const resource = this.assembler.toResourceFromEntity(entity);
    return this.http.post<EquipmentResource>(this.url, resource).pipe(
      map(r => this.assembler.toEntityFromResource(r)),
      catchError(() => throwError(() => new Error('Failed to register equipment')))
    );
  }
}
