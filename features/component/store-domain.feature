Feature: store domain component

  Scenario: platform subdomain yields short slug
    When I canonicalize host "iyre-collections.digi-carts.com"
    Then the store slug is "iyre-collections"

  Scenario: custom domain is kept
    When I canonicalize host "shop.example.com"
    Then the store slug is "shop.example.com"
