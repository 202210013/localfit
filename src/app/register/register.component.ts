import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterECommComponent {
  registerForm: FormGroup;
  passwordStrength: number = 0;
  passwordStrengthText: string = '';
  showPassword: boolean = false;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });

    // Listen to password changes
    this.registerForm.get('password')?.valueChanges.subscribe(password => {
      this.checkPasswordStrength(password);
    });
  }

  checkPasswordStrength(password: string): void {
    if (!password) {
      this.passwordStrength = 0;
      this.passwordStrengthText = '';
      return;
    }

    let score = 0;

    // Check password length
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Check for lowercase letters
    if (/[a-z]/.test(password)) score += 1;

    // Check for uppercase letters
    if (/[A-Z]/.test(password)) score += 1;

    // Check for numbers
    if (/\d/.test(password)) score += 1;

    // Check for special characters
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

    this.passwordStrength = score;

    // Set strength text
    switch (score) {
      case 0:
      case 1:
        this.passwordStrengthText = 'Very Weak';
        break;
      case 2:
        this.passwordStrengthText = 'Weak';
        break;
      case 3:
        this.passwordStrengthText = 'Fair';
        break;
      case 4:
        this.passwordStrengthText = 'Good';
        break;
      case 5:
      case 6:
        this.passwordStrengthText = 'Strong';
        break;
      default:
        this.passwordStrengthText = '';
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  register() {
    if (this.registerForm.valid) {
      const { name, email, password } = this.registerForm.value;
      this.authService.register(name, email, password).subscribe(
        (response: any) => {
          Swal.fire({
            icon: 'success',
            title: 'Registration Successful!',
            text: 'You can now log in.',
            showConfirmButton: false,
            timer: 1800
          });
          setTimeout(() => this.router.navigate(['/login']), 1800);
        },
        (error: any) => {
          Swal.fire({
            icon: 'error',
            title: 'Registration Failed',
            text: error?.error?.message || 'Please try again.',
            timer: 2000
          });
          console.error('Registration failed', error);
        }
      );
    }
  }
}