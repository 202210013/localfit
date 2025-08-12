import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { io, Socket } from 'socket.io-client';
import { HttpClient } from '@angular/common/http';

interface Message {
  sender: string;
  recipient: string;
  content: string;
}

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.css']
})
export class MessageComponent implements OnInit, OnDestroy {
  userName = localStorage.getItem('user_email') || 'User'; // Use actual email
  users: { name: string, email: string }[] = [];
  messageForm: FormGroup;
  messages: Message[] = [];
  selectedRecipient: { name: string, email: string } | null = null; // <-- FIXED
  searchTerm: string = '';

  // Add these properties to your component class
  sidebarOpen = false;
  isMobile = false;

  private socket: Socket;

  constructor(private fb: FormBuilder, private router: Router, private http: HttpClient) {
    this.messageForm = this.fb.group({
      content: ['', [Validators.required, Validators.maxLength(250)]]
    });
    this.socket = io('https://localfit.onrender.com');
  }
  ngOnInit() {
    this.http.get<{ id: number, name: string, email: string }[]>('https://api.localfit.store/ecomm_api/Router.php?request=all-users')
  .subscribe(users => {
    this.users = users;
  });

    this.socket.on('all-messages', (msgs: Message[]) => {
      this.messages = msgs;
    });
    this.socket.on('receive-message', (msg: Message) => {
      this.messages.push(msg);
    });

    this.isMobile = window.innerWidth <= 700;
    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth <= 700;
      if (!this.isMobile) this.sidebarOpen = false;
    });
  }

  ngOnDestroy() {
    this.socket.disconnect();
  }

  selectRecipient(user: { name: string, email: string }) {
  if (user.email !== this.userName) {
    this.selectedRecipient = user;
    this.messageForm.reset();
    // Fetch messages from backend for this conversation
    this.http.get<Message[]>(
      `https://api.localfit.store/ecomm_api/Router.php?request=messages&user1=${this.userName}&user2=${user.email}`
    ).subscribe(msgs => {
      // Merge new messages, avoid duplicates
      const all = [...this.messages];
      msgs.forEach(m => {
        if (!all.find(existing =>
          existing.sender === m.sender &&
          existing.recipient === m.recipient &&
          existing.content === m.content
        )) {
          all.push(m);
        }
      });
      this.messages = all;
    });
    // Close sidebar on mobile
    if (this.isMobile) {
      this.sidebarOpen = false;
    }
  }
}
  sendMessage() {
  if (this.messageForm.valid && this.selectedRecipient) {
    const msg: Message = {
      sender: this.userName,
      recipient: this.selectedRecipient.email,
      content: this.messageForm.value.content
    };
    this.socket.emit('send-message', msg);
    // Save to backend
    this.http.post('https://api.localfit.store/ecomm_api/Router.php?request=send-message', msg)
      .subscribe();
    this.messageForm.reset();
  }
}

  filteredMessages() {
    if (!this.selectedRecipient) return [];
    return this.messages.filter(
      m =>
        (m.sender === this.userName && m.recipient === this.selectedRecipient!.email) ||
        (m.sender === this.selectedRecipient!.email && m.recipient === this.userName)
    );
  }

  goToProductListing() {
    this.router.navigate(['/product-listing']);
  }

  get usersWithConversation() {
    const convoEmails = new Set<string>();
    this.messages.forEach(msg => {
      if (msg.sender === this.userName) {
        convoEmails.add(msg.recipient);
      }
      if (msg.recipient === this.userName) {
        convoEmails.add(msg.sender);
      }
    });
    return this.users.filter(user =>
      user.email !== this.userName && convoEmails.has(user.email)
    );
  }

  filteredUsers() {
    const term = this.searchTerm.toLowerCase();
    return this.users.filter(user =>
      user.email !== this.userName &&
      (user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term))
    );
  }
}
