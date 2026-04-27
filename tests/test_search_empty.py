from playwright.sync_api import sync_playwright
import pytest
import os
import subprocess
import time

def test_no_results_message():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Load the index.html file directly for testing
        file_path = os.path.abspath('index.html')
        page.goto(f'file:///{file_path}')
        
        # Wait for content to load (it uses rewireAll which is called on load)
        page.wait_for_selector('.team-card')
        
        # Type a search query that should result in no matches
        search_input = page.locator('#teamSearch')
        search_input.fill('NON_EXISTENT_CHARACTER_NAME_12345')
        
        # Expect a "No results found" message to be visible
        # This is expected to FAIL because the feature hasn't been implemented yet
        no_results = page.locator('.no-results-message')
        assert no_results.is_visible(), "Expected 'No results found' message to be visible"
        assert "No results found" in no_results.text_content()
        
        browser.close()

if __name__ == "__main__":
    test_no_results_message()
