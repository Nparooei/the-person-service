Feature: Person Service
  Background:
    Given the Person Service is running
    And a valid person

  Scenario: Create a person and publish the creation to the microservice landscape
    When I create the person
    Then the API responds with status 201
    And the complete person is stored in the database
    And a person-created-event reaches EventBridge with the stored person

  Scenario: Create and list two different persons
    When I create the person
    Then the API responds with status 201
    Given another valid person with different personal information
    When I create the person
    Then the API responds with status 201
    And the persons have different identifiers
    When I list persons
    Then the API responds with status 200
    And the list contains both persons

  Scenario: List an empty database
    When I list persons
    Then the API responds with status 200
    And the person list is empty

  Scenario Outline: Reject invalid personal information
    When I create a person with invalid "<field>"
    Then the API responds with status 400
    And no person is stored
    Examples:
      | field       |
      | firstName   |
      | lastName    |
      | phoneNumber |
      | address     |

  Scenario: Reject malformed JSON
    When I send malformed JSON
    Then the API responds with status 400
    And no person is stored

  Scenario: Retrieve six persons across bounded pages
    Given six persons exist
    When I list persons
    Then the API responds with status 200
    And the first page contains five persons and a continuation token
    When I follow all remaining person pages

  Scenario: Reject requests exceeding the page size cap
    When I request a person page with limit "6"
    Then the API responds with status 400
