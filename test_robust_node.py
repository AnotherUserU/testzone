from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        # Using absolute path
        path = os.path.abspath('index.html')
        page.goto(f'file:///{path}')
        
        # Click the first card's screenshot button
        # Wait for buildCard to run
        page.wait_for_selector('.download-node-btn')
        
        # Click the first screenshot button
        page.click('.download-node-btn >> nth=0')
        
        # Wait for modal
        page.wait_for_selector('#dlModal.open')
        
        # Click Download
        page.click('#dlDownloadBtn')
        
        # Check fbStatus for success message
        try:
            page.wait_for_selector('text=Downloaded', timeout=10000)
            print('SUCCESS: Found Downloaded message')
        except:
            print('FAILED: Did not find Downloaded message')
            
        browser.close()

if __name__ == "__main__":
    run()
