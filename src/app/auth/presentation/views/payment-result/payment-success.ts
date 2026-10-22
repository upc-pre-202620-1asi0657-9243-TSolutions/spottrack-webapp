import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [TranslateModule, MatIconModule],
  templateUrl: './payment-success.html',
  styleUrl:    './payment-result.scss',
})
export class PaymentSuccessComponent {
  private router = inject(Router);

  continue(): void {
    // No session exists here — the account is created by the webhook after payment.
    this.router.navigate(['/login']);
  }
}
