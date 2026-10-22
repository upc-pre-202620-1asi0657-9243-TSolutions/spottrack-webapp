import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { MaintenanceSchedule, TaskType, ScheduleStatus } from '../domain/model/maintenance-schedule.entity';
import { MaintenanceScheduleResource, MaintenanceScheduleResponse } from './maintenance-response';

export class MaintenanceScheduleAssembler implements BaseAssembler<MaintenanceSchedule, MaintenanceScheduleResource, MaintenanceScheduleResponse> {
  toEntitiesFromResponse(response: MaintenanceScheduleResponse): MaintenanceSchedule[] {
    return response.map(r => this.toEntityFromResource(r));
  }

  toEntityFromResource(r: MaintenanceScheduleResource): MaintenanceSchedule {
    return new MaintenanceSchedule({
      id:            r.id,
      equipmentId:   r.equipment_id,
      scheduledDate: r.scheduled_date,
      scheduledTime: r.scheduled_time ?? '10:00',
      taskType:      r.task_type as TaskType,
      notes:         r.notes ?? '',
      status:        (r.status as ScheduleStatus) ?? ScheduleStatus.PENDING,
    });
  }

  toResourceFromEntity(e: MaintenanceSchedule): MaintenanceScheduleResource {
    return {
      id:             e.id,
      equipment_id:   e.equipmentId,
      scheduled_date: e.scheduledDate,
      scheduled_time: e.scheduledTime,
      task_type:      e.taskType,
      notes:          e.notes,
      status:         e.status,
    };
  }
}
