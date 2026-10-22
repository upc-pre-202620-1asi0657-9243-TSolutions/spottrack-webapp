import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { MaintenanceTicket } from '../domain/model/maintenance-ticket.entity';
import { MaintenanceTicketResource } from './maintenance-response';
import { MaintenanceTicketAssembler } from './maintenance-ticket-assembler';
import { environment } from '../../../environments/environment';

export class MaintenanceTicketApiEndpoint {
  private readonly url = `${environment.apiBase}/maintenance/tickets`;
  private readonly assembler = new MaintenanceTicketAssembler();

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<MaintenanceTicket[]> {
    return this.http.get<MaintenanceTicketResource[]>(this.url).pipe(
      map(list => list.map(r => this.assembler.toEntityFromResource(r))),
      catchError(err => throwError(() => err))
    );
  }
}
