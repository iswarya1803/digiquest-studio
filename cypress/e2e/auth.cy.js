describe('Authentication Flows', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('allows user to navigate between login and signup', () => {
    cy.contains("Don't have an account?").should('be.visible');
    cy.contains('Create Account').click();
    cy.url().should('include', '/');
    cy.contains('Create Account').should('be.visible');
    cy.contains('Back to Login').click();
    cy.contains('Sign In').should('be.visible');
  });

  it('shows error on invalid login', () => {
    cy.get('input[type="email"]').type('invalid@digiquest.com');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    cy.contains('Invalid').should('be.visible');
  });

  it('can log in using admin quick-fill button', () => {
    cy.contains('Admin Portal').click();
    cy.get('input[type="email"]').should('have.value', 'admin@digiquest.com');
    cy.get('input[type="password"]').should('have.value', 'admin123');
    cy.get('button[type="submit"]').click();
    cy.contains('Owner Dashboard').should('be.visible');
  });
});
