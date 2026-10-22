import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { Equipment, EquipmentStatus } from '../domain/model/equipment.entity';
import { EquipmentApiEndpoint } from './equipment-api-endpoint';
import { EquipmentAssembler } from './equipment-assembler';
import { EquipmentResource } from './equipment-response';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EquipmentApi extends BaseApi {
  private readonly endpoint:  EquipmentApiEndpoint;
  private readonly assembler = new EquipmentAssembler();

  constructor(private readonly http: HttpClient) {
    super();
    this.endpoint = new EquipmentApiEndpoint(http);
  }

  getEquipment(): Observable<Equipment[]>                      { return this.endpoint.getAll(); }
  getEquipmentByGym(gymId: string): Observable<Equipment[]>    { return this.endpoint.getByGym(gymId); }
  registerEquipment(entity: Equipment): Observable<Equipment>  { return this.endpoint.create(entity); }

  updateEquipmentStatus(uuid: string, status: EquipmentStatus): Observable<Equipment> {
    return this.http.patch<EquipmentResource>(
      `${environment.apiBase}/equipments/${uuid}/status`,
      { id: uuid, status }
    ).pipe(
      map(r => this.assembler.toEntityFromResource(r)),
      catchError(() => throwError(() => new Error('Failed to update equipment status')))
    );
  }

  decommissionEquipment(uuid: string): Observable<void> {
    return this.http.patch<void>(
      `${environment.apiBase}/equipments/${uuid}/decomission`,
      { equipmentId: uuid }
    ).pipe(
      catchError(() => throwError(() => new Error('Failed to decommission equipment')))
    );
  }

  defineMaintenanceThreshold(uuid: string, threshold: string): Observable<Equipment> {
    return this.http.patch<EquipmentResource>(
      `${environment.apiBase}/equipments/${uuid}/maintenance-threshold`,
      { equipmentId: { uuid }, threshold }
    ).pipe(
      map(r => this.assembler.toEntityFromResource(r)),
      catchError(() => throwError(() => new Error('Failed to define maintenance threshold')))
    );
  }
}
