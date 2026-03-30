# SOP-Guard Pro — Email Delivery Testing Guide

This guide outlines how to verify and test the newly integrated Resend email delivery system across both the **Auth Waiting Room** and the **Pulse Notification** modules.

## 1. Prerequisites (Environment Setup)

Before testing, ensure your local environment contains the necessary Resend API key:

### `.env` configuration
Add your Resend API key to your `.env` file:
```bash
RESEND_API_KEY=re_your_api_key_here
```

> [!NOTE]
> **Sandbox Testing**: We have configured the system to use `onboarding@resend.dev` as the sender. This allows you to test immediately using the Resend sandbox.
> 
> [!IMPORTANT]
> When using the Resend **Sandbox/Onboarding** address, you can **ONLY** send emails to the single email address used to create your Resend account. To send to other addresses or domains, you must verify a custom domain in the Resend Dashboard.

---

## 2. Testing the Auth Waiting Room (Approval Email)

This verifies that new users receive an email once an Admin grants them access.

1.  **Signup as a Test User**:
    - Go to `/signup`.
    - Register with a valid email address (if using a Resend verified domain) or your own account email.
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
    - Check the inbox for the test user. You should receive a branded "Your Account is Approved" email.

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
    - All other active users in that audience who have email enabled will receive a "New Operations Notice" email.
    - *Note: The system purposefully skips sending an email to the person who posted the notice.*
4.  **Test Replies**:
    - As a second user, reply to the notice.
    - The original author of the notice should receive a "Pulse Reply Received" email alert.

---

## 4. Troubleshooting

- **Check Server Logs**: If an email fails to send, check the terminal running `npm run dev`. We have added `console.error` logs for Resend delivery failures.
- **Resend Dashboard**: Visit [resend.com/emails](https://resend.com/emails) to see a live log of every email the API attempted to send, including delivery status and bounce reports.
- **Spam Folder**: During initial setup with unverified domains, branded emails may occasionally land in spam. Verify your sender domain in Resend to improve deliverability.
