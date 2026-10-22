import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SignInRequest  { username: string; password: string; }
export interface SignUpRequest  { username: string; password: string; }
export interface AuthResponse   { id: number; username: string; token: string; roles?: string[]; role?: string; }

export interface RegisterBusinessRequest {
  email:          string;
  password:       string;
  firstName:      string;
  lastName:       string;
  phoneNumber:    string;
  dni:            string;
  companyName:    string;
  ruc:            string;
  legalStructure: string;
  companyPhone:   string;
  companyEmail:   string;
  streetAddress:  string;
  city:           string;
  district:       string;
  membershipTier: 'BASIC' | 'MID' | 'PLATINUM';
}

export interface RegisterBusinessResponse {
  checkoutUrl:           string;
  pendingRegistrationId: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly base = `${environment.apiBase}/authentication`;

  constructor(private readonly http: HttpClient) {}

  signIn(body: SignInRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/sign-in`, body);
  }

  signUp(body: SignUpRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/sign-up`, body);
  }

  registerBusiness(body: RegisterBusinessRequest): Observable<RegisterBusinessResponse> {
    return this.http.post<RegisterBusinessResponse>(`${environment.apiBase}/register-business`, body);
  }

  getUser(id: number): Observable<any> {
    return this.http.get<any>(`${environment.apiBase}/users/${id}`);
  }
}
