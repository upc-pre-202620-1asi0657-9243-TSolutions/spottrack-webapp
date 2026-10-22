import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-payment-cancel',
  standalone: true,
  imports: [TranslateModule, MatIconModule],
  templateUrl: './payment-cancel.html',
  styleUrl:    './payment-result.scss',
})
export class PaymentCancelComponent {
  private router = inject(Router);

  retry(): void {
    this.router.navigate(['/register/plans']);
  }
}
