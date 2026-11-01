# LiveDesk AWS deployment checklist

Use this checklist together with the detailed walkthrough in the root `README.md`.

## Before deploying

- [ ] Create an AWS VPC with private subnets for Amazon RDS.
- [ ] Create an RDS PostgreSQL database with public access disabled.
- [ ] Allow inbound TCP 5432 to the RDS security group only from the EC2 security group.
- [ ] Create an EC2 instance with an IAM instance role and a restricted security group.
- [ ] Keep SSH restricted to your IP or use AWS Systems Manager Session Manager.
- [ ] Create an Application Load Balancer and an HTTPS certificate in AWS Certificate Manager.
- [ ] Store the DB password and JWT secret securely; do not commit `.env`.
- [ ] Use a unique production administrator email and password.

## Deploy

1. Copy the project to EC2.
2. Create `.env` from `.env.example` and set the RDS endpoint, unique secrets, and HTTPS application origin.
3. Confirm Docker Engine and the Docker Compose plugin are available.
4. Run `docker compose -f docker-compose.aws.yml up --build -d`.
5. Confirm both containers are healthy with `docker compose -f docker-compose.aws.yml ps`.
6. Register the EC2 container's port 80 as the ALB target and use `/actuator/health` as the health-check path.
7. Point the DNS name to the ALB and verify the HTTPS certificate.

## Smoke tests after deployment

- [ ] Open the HTTPS URL and sign in with the bootstrap administrator.
- [ ] Register a customer account in a private/incognito browser.
- [ ] Create a ticket as the customer and verify it appears in the agent workspace.
- [ ] Reply from the agent workspace and verify the customer receives the message without refreshing.
- [ ] Change the ticket status and confirm the customer's view updates.
- [ ] Verify `/actuator/health` reports `UP` through the ALB.
- [ ] Review application logs in CloudWatch or your configured log collection destination.
- [ ] Remove or rotate the bootstrap admin password from the running environment after first use.

## Operational cautions

The included STOMP simple broker is in-memory and designed for a single backend instance. Do not scale the backend horizontally until a shared broker or equivalent fan-out design is configured. Configure database backups, monitoring, TLS, and database migrations before serving real customer data.
