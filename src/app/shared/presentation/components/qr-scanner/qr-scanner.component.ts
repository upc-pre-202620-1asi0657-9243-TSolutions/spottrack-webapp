import {
  AfterViewInit,
  Component,
  EventEmitter,
  NgZone,
  OnDestroy,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Html5Qrcode } from 'html5-qrcode';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './qr-scanner.component.html',
  styleUrl: './qr-scanner.component.scss',
})
export class QrScannerComponent implements AfterViewInit, OnDestroy {
  @Output() scanned = new EventEmitter<string>();
  @Output() closed  = new EventEmitter<void>();

  readonly mode      = signal<'camera' | 'file'>('camera');
  readonly scanning  = signal(false);
  readonly scanError = signal<string | null>(null);

  // Unique IDs avoid conflicts when multiple instances mount
  readonly cameraId = `qr-cam-${Math.random().toString(36).slice(2, 8)}`;
  readonly fileId   = `qr-file-${Math.random().toString(36).slice(2, 8)}`;

  private camScanner?: Html5Qrcode;

  constructor(private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    this.camScanner = new Html5Qrcode(this.cameraId);
  }

  startCamera(): void {
    this.scanError.set(null);
    this.scanning.set(true);
    this.camScanner!
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text: string) => {
          this.zone.run(() => {
            this.stopCamera();
            this.scanned.emit(text);
          });
        },
        undefined
      )
      .catch(() => {
        this.zone.run(() => {
          this.scanning.set(false);
          this.scanError.set(
            'No se pudo acceder a la cámara. Prueba con la opción de archivo.'
          );
        });
      });
  }

  stopCamera(): void {
    if (this.camScanner && this.scanning()) {
      this.camScanner.stop().catch(() => {});
      this.scanning.set(false);
    }
  }

  switchMode(m: 'camera' | 'file'): void {
    if (this.scanning()) this.stopCamera();
    this.scanError.set(null);
    this.mode.set(m);
  }

  onFileSelected(event: Event, inputEl: HTMLInputElement): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    inputEl.value = ''; // reset so the same file can be re-selected
    if (!file) return;
    this.scanError.set(null);
    this.scanning.set(true);
    let fileScanner: Html5Qrcode | null = null;
    try {
      fileScanner = new Html5Qrcode(this.fileId);
    } catch {
      this.zone.run(() => {
        this.scanning.set(false);
        this.scanError.set('Error al iniciar el escáner de archivo.');
      });
      return;
    }
    const timeout = setTimeout(() => {
      this.zone.run(() => {
        this.scanning.set(false);
        this.scanError.set('No se pudo leer el QR. Intenta con otra imagen.');
      });
    }, 8000);
    fileScanner
      .scanFile(file, false)
      .then((text: string) => {
        clearTimeout(timeout);
        this.zone.run(() => {
          this.scanning.set(false);
          this.scanned.emit(text);
        });
      })
      .catch(() => {
        clearTimeout(timeout);
        this.zone.run(() => {
          this.scanning.set(false);
          this.scanError.set('No se encontró código QR en la imagen.');
        });
      });
  }

  close(): void {
    this.stopCamera();
    this.closed.emit();
  }

  ngOnDestroy(): void {
    this.camScanner?.stop().catch(() => {});
  }
}
