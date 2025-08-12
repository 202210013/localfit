import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterECommComponent {
  registerForm: FormGroup;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required]], // Added name field
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
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