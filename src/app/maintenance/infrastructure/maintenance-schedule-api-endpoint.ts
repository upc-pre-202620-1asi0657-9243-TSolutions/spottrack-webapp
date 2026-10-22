import { HttpClient } from '@angular/common/http';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { MaintenanceSchedule } from '../domain/model/maintenance-schedule.entity';
import { MaintenanceScheduleResource, MaintenanceScheduleResponse } from './maintenance-response';
import { MaintenanceScheduleAssembler } from './maintenance-schedule-assembler';
import { environment } from '../../../environments/environment';

export class MaintenanceScheduleApiEndpoint extends BaseApiEndpoint<
  MaintenanceSchedule,
  MaintenanceScheduleResource,
  MaintenanceScheduleResponse,
  MaintenanceScheduleAssembler
> {
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.apiBase}/maintenance/schedules`,
      new MaintenanceScheduleAssembler()
    );
  }
}
