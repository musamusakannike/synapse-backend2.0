const nodemailer = require("nodemailer")

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_PASSWORD,
      },
    })
  }

  // Common email template wrapper
  getEmailTemplate(content, primaryColor = "#6366f1") {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Synapse AI</title>
        <!--[if mso]>
        <noscript>
          <xml>
            <o:OfficeDocumentSettings>
              <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
          </xml>
        </noscript>
        <![endif]-->
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #334155;
            background-color: #f8fafc;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          }
          
          .header {
            background: linear-gradient(135deg, ${primaryColor} 0%, ${this.adjustBrightness(primaryColor, -20)} 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
          }
          
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
          }
          
          .header p {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 300;
          }
          
          .content {
            padding: 40px 30px;
          }
          
          .content h2 {
            font-size: 24px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 20px;
            line-height: 1.3;
          }
          
          .content p {
            font-size: 16px;
            margin-bottom: 20px;
            color: #475569;
            line-height: 1.7;
          }
          
          .cta-container {
            text-align: center;
            margin: 40px 0;
          }
          
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, ${primaryColor} 0%, ${this.adjustBrightness(primaryColor, -10)} 100%);
            color: white !important;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            letter-spacing: 0.5px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
          }
          
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
          }
          
          .backup-link {
            background-color: #f1f5f9;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
            border-left: 4px solid ${primaryColor};
          }
          
          .backup-link p {
            margin-bottom: 10px;
            font-size: 14px;
            color: #64748b;
          }
          
          .backup-link a {
            color: ${primaryColor};
            word-break: break-all;
            font-size: 14px;
            text-decoration: none;
          }
          
          .expiry-notice {
            background-color: #fef3c7;
            border: 1px solid #fbbf24;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            text-align: center;
          }
          
          .expiry-notice p {
            color: #92400e;
            font-size: 14px;
            font-weight: 500;
            margin: 0;
          }
          
          .footer {
            background-color: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
          }
          
          .footer p {
            font-size: 14px;
            color: #94a3b8;
            margin: 0;
            line-height: 1.5;
          }
          
          .security-notice {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
          }
          
          .security-notice p {
            color: #dc2626;
            font-size: 14px;
            margin: 0;
            font-weight: 500;
          }
          
          .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
            margin: 30px 0;
          }
          
          @media only screen and (max-width: 600px) {
            .email-container {
              margin: 0;
              border-radius: 0;
            }
            
            .header {
              padding: 30px 20px;
            }
            
            .content {
              padding: 30px 20px;
            }
            
            .footer {
              padding: 20px;
            }
            
            .header h1 {
              font-size: 24px;
            }
            
            .content h2 {
              font-size: 20px;
            }
            
            .cta-button {
              padding: 14px 28px;
              font-size: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div style="padding: 20px;">
          <div class="email-container">
            ${content}
          </div>
        </div>
      </body>
      </html>
    `
  }

  // Helper function to adjust color brightness
  adjustBrightness(hex, percent) {
    const num = parseInt(hex.replace("#", ""), 16)
    const amt = Math.round(2.55 * percent)
    const R = (num >> 16) + amt
    const G = (num >> 8 & 0x00FF) + amt
    const B = (num & 0x0000FF) + amt
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1)
  }

  async sendVerificationEmail(email, token) {
    const verificationUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/verify-email?token=${token}`
    
    const emailContent = `
      <div class="header">
        <h1>🚀 Welcome to Synapse AI</h1>
        <p>Your AI-powered journey begins here</p>
      </div>
      
      <div class="content">
        <h2>Verify Your Email Address</h2>
        <p>Thanks for joining Synapse AI! We're excited to have you on board. To get started and secure your account, please verify your email address.</p>
        
        <div class="cta-container">
          <a href="${verificationUrl}" class="cta-button">
            ✅ Verify Email Address
          </a>
        </div>
        
        <div class="backup-link">
          <p><strong>Button not working?</strong> Copy and paste this link into your browser:</p>
          <a href="${verificationUrl}">${verificationUrl}</a>
        </div>
        
        <div class="expiry-notice">
          <p>⏰ This verification link expires in 24 hours</p>
        </div>
        
        <div class="divider"></div>
        
        <p>Once verified, you'll have full access to:</p>
        <ul style="margin-left: 20px; color: #475569;">
          <li>Advanced AI features</li>
          <li>Personalized experiences</li>
          <li>Priority support</li>
          <li>Exclusive updates</li>
        </ul>
      </div>
      
      <div class="footer">
        <p>If you didn't create an account with Synapse AI, please ignore this email.</p>
        <p style="margin-top: 10px;">© ${new Date().getFullYear()} Synapse AI. All rights reserved.</p>
      </div>
    `

    const mailOptions = {
      from: `${process.env.FROM_NAME || "Synapse AI"} <${process.env.GMAIL_EMAIL}>`,
      to: email,
      subject: "🚀 Welcome to Synapse AI - Verify Your Email",
      html: this.getEmailTemplate(emailContent, "#6366f1"),
    }

    try {
      await this.transporter.sendMail(mailOptions)
      console.log("Verification email sent to:", email)
    } catch (error) {
      console.error("Error sending verification email:", error)
      throw new Error("Failed to send verification email")
    }
  }

  async sendPasswordResetEmail(email, token) {
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/reset-password?token=${token}`
    
    const emailContent = `
      <div class="header">
        <h1>🔐 Password Reset</h1>
        <p>Secure your Synapse AI account</p>
      </div>
      
      <div class="content">
        <h2>Reset Your Password</h2>
        <p>We received a request to reset your password for your Synapse AI account. If you made this request, click the button below to create a new password.</p>
        
        <div class="cta-container">
          <a href="${resetUrl}" class="cta-button" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);">
            🔑 Reset Password
          </a>
        </div>
        
        <div class="backup-link">
          <p><strong>Button not working?</strong> Copy and paste this link into your browser:</p>
          <a href="${resetUrl}">${resetUrl}</a>
        </div>
        
        <div class="expiry-notice" style="background-color: #fef2f2; border-color: #fca5a5;">
          <p style="color: #dc2626;">⚠️ This reset link expires in 1 hour for security</p>
        </div>
        
        <div class="security-notice">
          <p>🛡️ For your security, this link can only be used once</p>
        </div>
        
        <div class="divider"></div>
        
        <p><strong>Security Tips:</strong></p>
        <ul style="margin-left: 20px; color: #475569;">
          <li>Choose a strong, unique password</li>
          <li>Use a combination of letters, numbers, and symbols</li>
          <li>Don't reuse passwords from other accounts</li>
          <li>Consider using a password manager</li>
        </ul>
      </div>
      
      <div class="footer">
        <p>If you didn't request a password reset, please ignore this email. Your account remains secure.</p>
        <p style="margin-top: 10px;">© ${new Date().getFullYear()} Synapse AI. All rights reserved.</p>
      </div>
    `

    const mailOptions = {
      from: `${process.env.FROM_NAME || "Synapse AI"} <${process.env.GMAIL_EMAIL}>`,
      to: email,
      subject: "🔐 Password Reset Request - Synapse AI",
      html: this.getEmailTemplate(emailContent, "#dc2626"),
    }

    try {
      await this.transporter.sendMail(mailOptions)
      console.log("Password reset email sent to:", email)
    } catch (error) {
      console.error("Error sending password reset email:", error)
      throw new Error("Failed to send password reset email")
    }
  }

  // Bonus: Welcome email for new users
  async sendWelcomeEmail(email, userName) {
    const dashboardUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`
    
    const emailContent = `
      <div class="header">
        <h1>🎉 Welcome to Synapse AI!</h1>
        <p>Your AI adventure starts now</p>
      </div>
      
      <div class="content">
        <h2>Hello ${userName || 'there'}! 👋</h2>
        <p>Welcome to the Synapse AI community! We're thrilled to have you join thousands of users who are already transforming their workflows with AI.</p>
        
        <div class="cta-container">
          <a href="${dashboardUrl}" class="cta-button">
            🚀 Explore Dashboard
          </a>
        </div>
        
        <div class="divider"></div>
        
        <p><strong>What's next?</strong></p>
        <ul style="margin-left: 20px; color: #475569; margin-bottom: 20px;">
          <li>✨ Complete your profile setup</li>
          <li>🔍 Explore our AI features</li>
          <li>📚 Check out our getting started guide</li>
          <li>💬 Join our community discussions</li>
        </ul>
        
        <p>Need help getting started? Our support team is here for you 24/7.</p>
      </div>
      
      <div class="footer">
        <p>Questions? Reply to this email or visit our help center.</p>
        <p style="margin-top: 10px;">© ${new Date().getFullYear()} Synapse AI. All rights reserved.</p>
      </div>
    `

    const mailOptions = {
      from: `${process.env.FROM_NAME || "Synapse AI"} <${process.env.GMAIL_EMAIL}>`,
      to: email,
      subject: "🎉 Welcome to Synapse AI - Let's Get Started!",
      html: this.getEmailTemplate(emailContent, "#10b981"),
    }

    try {
      await this.transporter.sendMail(mailOptions)
      console.log("Welcome email sent to:", email)
    } catch (error) {
      console.error("Error sending welcome email:", error)
      throw new Error("Failed to send welcome email")
    }
  }
}

module.exports = EmailService