# SOP-Guard Pro — Email Delivery Testing Guide

This guide outlines how to verify and test the newly integrated Mailtrap email delivery system across both the **Auth Waiting Room** and the **Pulse Notification** modules.

## 1. Prerequisites (Environment Setup)

Before testing, ensure your local environment contains the necessary Mailtrap SMTP credentials:

### `.env` configuration
Add your Mailtrap settings to your `.env` or `.env.local` file:
```bash
MAILTRAP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=your_mailtrap_user_here
MAILTRAP_PASS=your_mailtrap_password_here
MAILTRAP_FROM_EMAIL=onboarding@your-domain.com
```

> [!NOTE]
> **Sandbox Testing**: If using the Mailtrap Sandbox for testing, Mailtrap catches all outbound emails and displays them in your virtual inbox without sending them to the actual recipients. You do not need to worry about spamming real users while developing.
> 
> [!IMPORTANT]
> When you migrate to Production Mailtrap Email Sending, ensure you verify your sender domain in the Mailtrap Dashboard, update your `MAILTRAP_HOST` (e.g. to `send.smtp.mailtrap.io`), and use your real sending credentials.

---

## 2. Testing the Auth Waiting Room (Approval Email)

This verifies that new users receive an email once an Admin grants them access.

1.  **Signup as a Test User**:
    - Go to `/signup`.
    - Register with any email address.
    - You will be redirected to the `/waiting-room`.
2.  **Login as Admin**:
    - Open a private/incognito window or logout.
    - Login as the system Admin.
3.  **Approve the User**:
    - Navigate to **Settings → Users**.
    - Scroll to the **Pending Access Requests** section.
    - Locate your test user and click **Approve**.
4.  **Verification**:
    - The test user's screen should automatically refresh and move to `/onboarding`.
    - Check your Mailtrap Inbox. You should receive a branded "Your Account is Approved" email.

---

## 3. Testing Pulse Notifications (Generic Email)

This verifies that operational notices and replies trigger real-time email alerts based on user preferences.

1.  **Check Notification Preferences**:
    - Logged in as any user, go to **Settings**.
    - Ensure "Email Notifications" is toggled **ON** under the Notification Preferences section.
2.  **Broadcast a Notice**:
    - Open the **Pulse Panel** (Bell icon in TopNav or right-side handle).
    - Post a new **Notice** to "Everyone" or your specific "Department".
3.  **Verification**:
    - All other active users in that audience who have email enabled will have an email generated for them.
    - Check your Mailtrap Inbox. You should see a "New Operations Notice" email for each recipient.
    - *Note: The system purposefully skips sending an email to the person who posted the notice.*
4.  **Test Replies**:
    - As a second user, reply to the notice.
    - Check your Mailtrap Inbox to see if the original author of the notice receives a "Pulse Reply Received" email alert.

---

## 4. Troubleshooting

- **Check Server Logs**: If an email fails to send, check the terminal running `npm run dev`. We have added `console.error` logs for Mailtrap delivery failures.
- **Mailtrap Dashboard**: Visit your Mailtrap account to see a live log of every email the SMTP transport attempted to send.
- **Spam Folder**: During actual production sending with unverified domains, branded emails may occasionally land in spam. Verify your sender domain in Mailtrap to improve deliverability.
