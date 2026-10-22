import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { AuthStore } from '../../../application/auth.store';

@Component({
  selector: 'app-client-home',
  standalone: true,
  imports: [TranslateModule, MatIconModule],
  templateUrl: './client-home.component.html',
  styleUrl:    './client-home.component.scss',
})
export class ClientHomeComponent {
  readonly auth = inject(AuthStore);
}
