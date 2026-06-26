describe('Dashboard and Projects Lifecycle', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.contains('Admin Portal').click();
    cy.get('button[type="submit"]').click();
    cy.contains('Owner Dashboard').should('be.visible');
  });

  it('can create a new project', () => {
    cy.contains('New Project').click();
    cy.get('input[name="title"]').type('E2E Test Feature Film');
    cy.get('select[name="client_id"]').select(1); // Select first client
    cy.get('select[name="priority"]').select('High');
    cy.get('input[name="deadline"]').type('2026-11-20');
    cy.contains('button', 'Create Project').click();
    cy.contains('E2E Test Feature Film').should('be.visible');
  });

  it('allows clicking refresh button', () => {
    cy.contains('Refresh').click();
    cy.contains('Owner Dashboard').should('be.visible');
  });
});
