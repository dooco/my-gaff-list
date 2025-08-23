# Stripe Identity Verification Setup

## Overview
This document outlines the Stripe Identity verification system implemented in the my-gaff-list platform. The system provides a three-tier verification system (Basic, Standard, Premium) that enhances trust without restricting functionality.

## Key Principles
- **Non-blocking**: Unverified landlords have full permission to list properties
- **Incentive-based**: Verification provides benefits, not access
- **Integrated**: Works alongside existing email and SMS verification
- **Progressive**: Three-tier system allows gradual trust building

## Verification Levels

### 1. Basic (Email Verified)
- **Trust Score**: 40%
- **Requirements**: Email verification only
- **Benefits**:
  - Basic messaging capabilities
  - Save favorite properties
  - Email notifications

### 2. Standard (Email + Phone Verified)
- **Trust Score**: 70%
- **Requirements**: Email + Phone verification
- **Benefits**:
  - All Basic benefits
  - Extended messaging limits
  - Priority in search results
  - SMS notifications
  - Phone-verified badge

### 3. Premium (Full Identity Verification)
- **Trust Score**: 100%
- **Requirements**: Email + Phone + Stripe Identity verification
- **Benefits**:
  - All Standard benefits
  - Fully Verified badge on profile and listings
  - Unlimited messaging
  - Priority customer support
  - Advanced analytics
  - Featured property listings
  - Verified filter in search

## Backend Implementation

### Models
- **User Model** (`apps/users/models.py`):
  - Added `identity_verified`, `verification_level`, `trust_score` fields
  - Method `update_verification_level()` automatically calculates level

- **IdentityVerification Model**:
  - Enhanced with Stripe-specific fields
  - Tracks document type, risk score, verification status
  - Stores Stripe session and report IDs

### API Endpoints
- `POST /api/users/verification/identity/create-session/` - Create Stripe session
- `GET /api/users/verification/identity/status/` - Check verification status
- `GET /api/users/verification/identity/benefits/` - Get verification benefits
- `POST /api/users/verification/identity/<id>/cancel/` - Cancel verification
- `POST /api/users/verification/identity/webhook/` - Stripe webhook handler

### Configuration
Add to `.env`:
```env
STRIPE_PUBLIC_KEY=pk_test_your-key
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-secret
STRIPE_IDENTITY_ENABLED=True
STRIPE_TEST_MODE=True
```

## Frontend Implementation

### Components
1. **IdentityVerification** (`components/verification/IdentityVerification.tsx`)
   - Main verification flow component
   - Handles Stripe Identity SDK integration
   - Shows verification status and benefits

2. **VerificationBadge** (`components/verification/VerificationBadge.tsx`)
   - Reusable badge component
   - Shows verification level with icons
   - Includes tooltips for context

3. **VerificationPrompt** (`components/verification/VerificationPrompt.tsx`)
   - Non-blocking reminder system
   - Configurable display styles (banner, card, inline)
   - Smart timing based on user type

### Integration Points
- Property cards show landlord verification badges
- User profiles display verification status
- Search results can be filtered by verification level
- Messaging shows trust indicators

## Stripe Dashboard Setup

### 1. Enable Stripe Identity
1. Log into Stripe Dashboard
2. Navigate to Identity section
3. Enable Identity verification
4. Configure verification requirements

### 2. Configure Verification Types
- Document: Passport, Driver's License, ID Card
- Selfie: Required with liveness detection
- Address: Optional (not currently enforced)

### 3. Set Up Webhooks
Add webhook endpoint: `https://your-domain.com/api/users/verification/identity/webhook/`

Listen for events:
- `identity.verification_session.verified`
- `identity.verification_session.failed`
- `identity.verification_session.requires_input`
- `identity.verification_session.processing`
- `identity.verification_session.canceled`

### 4. Configure Test Mode
Use test mode documents for development:
- Test passport: `00000000` (any country)
- Test driver's license: `0000000000` (US)
- Always passes verification in test mode

## Admin Features

### Django Admin Interface
- View all verification attempts
- Manual verification override
- Risk score visualization
- Bulk actions for verification management
- Filter by status, type, and risk level

### Management Commands
```bash
# Update verification levels for all users
python manage.py update_verification_levels

# Run verification analytics
python manage.py verification_report
```

## Security Considerations

### Data Protection
- All verification data encrypted at rest
- PII redaction available via API
- GDPR-compliant data retention
- Automatic expiration of old verifications

### Fraud Prevention
- Risk scoring on all verifications
- Manual review flags for suspicious activity
- IP tracking for verification attempts
- Rate limiting on verification sessions

## Testing

### Test Cards
Use Stripe test mode with:
- Any test document number
- Test selfie (any image in test mode)
- Webhook testing via Stripe CLI

### API Testing
```python
# Test verification session creation
python manage.py test apps.users.tests.test_verification

# Test webhook handling
python manage.py test apps.users.tests.test_webhooks
```

## Monitoring

### Key Metrics
- Verification completion rate
- Average time to verify
- Failure reasons breakdown
- Verification level distribution

### Alerts
- High failure rate (>20%)
- Manual review queue size
- Webhook failures
- Expired verifications

## Future Enhancements

### Phase 2
- [ ] Automated re-verification reminders
- [ ] Verification expiry notifications
- [ ] Bulk verification for property management companies
- [ ] API for third-party integrations

### Phase 3
- [ ] Machine learning for fraud detection
- [ ] Custom verification workflows
- [ ] International document support expansion
- [ ] Blockchain verification certificates

## Testing Interface

### Using the Test HTML Page

1. **Open the test page**: Open `test-stripe-identity.html` in your browser
2. **Configure settings**: 
   - Enter your Stripe public key (pk_test_...)
   - Set backend URL (default: http://localhost:8000)
   - Enter test user credentials
3. **Run tests**: Use the interface to:
   - Authenticate users
   - Create verification sessions
   - Test the full verification flow
   - Check verification status
   - View verification benefits

### Test User Accounts
Default test accounts:
- Email: `jim@fixit.ie`
- Password: `password123`

## Support

### Common Issues
1. **Verification fails immediately**
   - Check Stripe API keys
   - Verify webhook configuration
   - Ensure CORS settings allow Stripe

2. **Webhooks not received**
   - Check webhook secret
   - Verify endpoint URL
   - Check Django CSRF exemption

3. **Test mode not working**
   - Ensure STRIPE_TEST_MODE=True
   - Use test API keys (starting with `sk_test_`)
   - Clear browser cache

### Resources
- [Stripe Identity Docs](https://stripe.com/docs/identity)
- [Django Integration Guide](https://stripe.com/docs/identity/verify-sessions)
- [Frontend SDK Reference](https://stripe.com/docs/js/identity/verify_identity)
- [Webhook Testing with Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Test Cards and Documents](https://stripe.com/docs/testing#identity-verification)