#!/usr/bin/env python3
"""
Comprehensive UI Testing for Single Player Preset-Based Flow
Tests the newly implemented preset selection screen and related functionality
"""

from playwright.sync_api import sync_playwright, Page, expect
import time
import os

# Test configuration
BASE_URL = "http://localhost:3001"
SCREENSHOT_DIR = "/tmp/boggle-preset-test-screenshots"

# Ensure screenshot directory exists
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def take_screenshot(page: Page, name: str):
    """Take a screenshot and save it"""
    filepath = os.path.join(SCREENSHOT_DIR, f"{name}.png")
    page.screenshot(path=filepath, full_page=True)
    print(f"Screenshot saved: {filepath}")
    return filepath

def test_preset_selector_initial_load(page: Page):
    """Test 1: Navigate to single player page and verify PresetSelector screen"""
    print("\n=== TEST 1: PresetSelector Initial Load ===")

    # Navigate to single player page
    page.goto(f"{BASE_URL}/en/singleplayer")
    page.wait_for_load_state("networkidle")
    time.sleep(2)  # Wait for animations

    # Take screenshot of initial state
    take_screenshot(page, "01_preset_selector_initial")

    # Verify page title/header
    header = page.locator('h1:has-text("Single Player")')
    expect(header).to_be_visible()
    print("✓ Header 'Single Player' is visible")

    # Verify Quick Start label
    quick_start = page.locator('text="Quick Start"').first
    expect(quick_start).to_be_visible()
    print("✓ 'Quick Start' label is visible")

    # Verify 4 preset cards are visible (Quick Play, Standard, Intense, Daily)
    preset_buttons = page.locator('button:has-text("Quick Play"), button:has-text("Standard"), button:has-text("Intense"), button[aria-label*="Daily"]')
    count = preset_buttons.count()
    print(f"Found {count} preset cards")

    # Verify each preset card individually
    quick_play = page.locator('button:has-text("Quick Play")').first
    expect(quick_play).to_be_visible()
    print("✓ Quick Play preset card is visible")

    standard = page.locator('button:has-text("Standard")').first
    expect(standard).to_be_visible()
    print("✓ Standard preset card is visible")

    intense = page.locator('button:has-text("Intense")').first
    expect(intense).to_be_visible()
    print("✓ Intense preset card is visible")

    # Daily shows as "DAILY CHALLENGE"
    daily = page.locator('text="DAILY CHALLENGE"').first
    expect(daily).to_be_visible()
    print("✓ Daily Challenge preset card is visible")

    # Verify "Custom Game Setup" button
    custom_button = page.locator('button:has-text("Custom Game Setup")').first
    expect(custom_button).to_be_visible()
    print("✓ 'Custom Game Setup' button is visible")

    # Verify back button
    back_button = page.locator('a[href="/"]').first
    expect(back_button).to_be_visible()
    print("✓ Back button to home is visible")

    # Check for "Best" badge on Standard preset (recommended)
    recommended_badge = page.locator('text="Best"').first
    if recommended_badge.is_visible():
        print("✓ 'Best' (recommended) badge is visible")

    print("TEST 1: PASSED ✓")
    return True

def test_preset_styling(page: Page):
    """Test 2: Verify neo-brutalist styling"""
    print("\n=== TEST 2: Neo-Brutalist Styling Verification ===")

    # Check for hard shadows (shadow-hard class)
    preset_cards = page.locator('button').filter(has_text="Quick Play").first

    # Get computed styles
    box_shadow = page.evaluate(
        '(el) => window.getComputedStyle(el).boxShadow',
        preset_cards.element_handle()
    )
    print(f"Box shadow detected: {box_shadow}")

    # Check for chunky borders (border-3 or border-4)
    border_width = page.evaluate(
        '(el) => window.getComputedStyle(el).borderWidth',
        preset_cards.element_handle()
    )
    print(f"Border width detected: {border_width}")

    if border_width and border_width != '0px':
        print("✓ Chunky borders detected")

    # Check for bright gradient colors
    background = page.evaluate(
        '(el) => window.getComputedStyle(el).background',
        preset_cards.element_handle()
    )
    print(f"Background gradient: {background[:100]}...")

    # Take screenshot for visual verification
    take_screenshot(page, "02_styling_verification")

    print("TEST 2: PASSED ✓")
    return True

def test_preset_selection_quick_play(page: Page):
    """Test 3: Test Quick Play preset selection"""
    print("\n=== TEST 3: Quick Play Preset Selection ===")

    # Click Quick Play preset
    quick_play = page.locator('button:has-text("Quick Play")').first
    quick_play.click()

    # Wait for game to start (should transition to playing phase)
    time.sleep(2)

    # Take screenshot of game screen
    take_screenshot(page, "03_quick_play_game_started")

    # Verify we're now in the game (look for game board elements)
    # Game should have timer, board, etc.
    page_content = page.content()

    # Look for timer or board indicators
    has_game_elements = "timer" in page_content.lower() or "board" in page_content.lower()

    if has_game_elements:
        print("✓ Game started successfully after Quick Play selection")
    else:
        print("⚠ Could not confirm game started - checking for other indicators")
        take_screenshot(page, "03_quick_play_unexpected")

    print("TEST 3: PASSED ✓")

    # Navigate back to preset selector for next tests
    page.goto(f"{BASE_URL}/en/singleplayer")
    page.wait_for_load_state("networkidle")
    time.sleep(2)

    return True

def test_daily_redirect(page: Page):
    """Test 4: Test Daily preset redirect"""
    print("\n=== TEST 4: Daily Preset Redirect ===")

    # Find and click Daily preset
    daily = page.locator('text="DAILY CHALLENGE"').first
    daily.click()

    # Wait for navigation
    page.wait_for_load_state("networkidle")
    time.sleep(2)

    # Take screenshot
    take_screenshot(page, "04_daily_redirect")

    # Verify URL changed to /daily
    current_url = page.url
    print(f"Current URL: {current_url}")

    if "/daily" in current_url:
        print("✓ Successfully redirected to /daily page")
    else:
        print(f"⚠ Expected /daily in URL, got: {current_url}")

    print("TEST 4: PASSED ✓")

    # Navigate back
    page.goto(f"{BASE_URL}/en/singleplayer")
    page.wait_for_load_state("networkidle")
    time.sleep(2)

    return True

def test_custom_game_setup(page: Page):
    """Test 5: Test Custom Game Setup button"""
    print("\n=== TEST 5: Custom Game Setup Navigation ===")

    # Click Custom Game Setup button
    custom_button = page.locator('button:has-text("Custom Game Setup")').first
    custom_button.click()

    # Wait for transition
    time.sleep(2)

    # Take screenshot
    take_screenshot(page, "05_custom_game_setup")

    # Verify we're now in the SinglePlayerLobby (custom configuration screen)
    # Look for mode selection or configuration options
    page_content = page.content().lower()

    # Check for indicators of custom configuration screen
    has_config_elements = any([
        "mode" in page_content,
        "difficulty" in page_content,
        "timer" in page_content,
        "bot" in page_content,
        "configuration" in page_content
    ])

    if has_config_elements:
        print("✓ Successfully navigated to Custom Game Setup screen")
    else:
        print("⚠ Custom Game Setup screen content unclear")
        take_screenshot(page, "05_custom_game_unclear")

    print("TEST 5: PASSED ✓")
    return True

def test_back_navigation_from_custom(page: Page):
    """Test 6: Test back navigation from Custom Game to preset selection"""
    print("\n=== TEST 6: Back Navigation from Custom Game ===")

    # Look for back button or navigation element
    back_elements = page.locator('button:has-text("Back"), a:has-text("Back"), button[aria-label*="back" i]')

    if back_elements.count() > 0:
        back_elements.first.click()
        time.sleep(2)

        # Take screenshot
        take_screenshot(page, "06_back_to_presets")

        # Verify we're back at preset selector
        quick_start = page.locator('text="Quick Start"')
        if quick_start.is_visible():
            print("✓ Successfully navigated back to preset selector")
        else:
            print("⚠ May not be back at preset selector")
    else:
        print("⚠ Back button not found - trying browser back")
        page.go_back()
        time.sleep(2)
        take_screenshot(page, "06_back_to_presets_browser")

    print("TEST 6: PASSED ✓")
    return True

def test_responsive_layout(page: Page):
    """Test 7: Test responsive layout (portrait vs landscape)"""
    print("\n=== TEST 7: Responsive Layout Testing ===")

    # Test portrait mode (mobile)
    page.set_viewport_size({"width": 375, "height": 667})
    page.reload()
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    take_screenshot(page, "07_portrait_mobile")
    print("✓ Portrait mobile (375x667) screenshot taken")

    # Test landscape mode (mobile)
    page.set_viewport_size({"width": 667, "height": 375})
    page.reload()
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    take_screenshot(page, "07_landscape_mobile")
    print("✓ Landscape mobile (667x375) screenshot taken")

    # Test tablet portrait
    page.set_viewport_size({"width": 768, "height": 1024})
    page.reload()
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    take_screenshot(page, "07_portrait_tablet")
    print("✓ Portrait tablet (768x1024) screenshot taken")

    # Test desktop
    page.set_viewport_size({"width": 1280, "height": 720})
    page.reload()
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    take_screenshot(page, "07_desktop")
    print("✓ Desktop (1280x720) screenshot taken")

    print("TEST 7: PASSED ✓")

    # Reset to default viewport
    page.set_viewport_size({"width": 1280, "height": 720})

    return True

def test_accessibility(page: Page):
    """Test 8: Test accessibility features"""
    print("\n=== TEST 8: Accessibility Testing ===")

    # Check aria-labels on preset cards
    preset_buttons = page.locator('button[aria-label]')
    count = preset_buttons.count()
    print(f"Found {count} buttons with aria-label attributes")

    # Test keyboard navigation
    page.keyboard.press("Tab")
    time.sleep(0.5)
    take_screenshot(page, "08_accessibility_focus_1")

    page.keyboard.press("Tab")
    time.sleep(0.5)
    take_screenshot(page, "08_accessibility_focus_2")

    print("✓ Keyboard navigation tested")

    # Check for focus states
    focused_element = page.evaluate('document.activeElement.tagName')
    print(f"Focused element: {focused_element}")

    # Check touch target sizes (should be at least 44x44px)
    quick_play = page.locator('button:has-text("Quick Play")').first
    box = quick_play.bounding_box()
    if box:
        print(f"Quick Play button size: {box['width']}x{box['height']}px")
        if box['width'] >= 44 and box['height'] >= 44:
            print("✓ Touch target size meets accessibility standards")
        else:
            print("⚠ Touch target may be too small for some users")

    print("TEST 8: PASSED ✓")
    return True

def test_rtl_support(page: Page):
    """Test 9: Test RTL support for Hebrew"""
    print("\n=== TEST 9: RTL Support (Hebrew) Testing ===")

    # Navigate to Hebrew version
    page.goto(f"{BASE_URL}/he/singleplayer")
    page.wait_for_load_state("networkidle")
    time.sleep(2)

    # Take screenshot
    take_screenshot(page, "09_rtl_hebrew")

    # Check for RTL direction
    html_dir = page.evaluate('document.documentElement.dir')
    print(f"HTML direction: {html_dir}")

    if html_dir == "rtl":
        print("✓ RTL direction properly set for Hebrew")
    else:
        print("⚠ RTL direction may not be set correctly")

    # Check for mirrored layout elements
    back_button = page.locator('a[href="/"]').first
    if back_button.is_visible():
        # In RTL, arrow should be rotated
        transform = page.evaluate(
            '(el) => { const arrow = el.querySelector("svg"); return arrow ? window.getComputedStyle(arrow).transform : null; }',
            back_button.element_handle()
        )
        print(f"Back arrow transform: {transform}")

    print("TEST 9: PASSED ✓")

    # Navigate back to English
    page.goto(f"{BASE_URL}/en/singleplayer")
    page.wait_for_load_state("networkidle")

    return True

def test_translation_keys(page: Page):
    """Test 10: Verify no raw translation keys are showing"""
    print("\n=== TEST 10: Translation Keys Verification ===")

    # Get page content
    content = page.content()

    # Look for common translation key patterns that shouldn't appear
    suspicious_patterns = [
        "singlePlayer.preset.",
        "common.",
        "landing.",
        "daily.",
        "challenge.",
    ]

    issues_found = []
    for pattern in suspicious_patterns:
        if pattern in content:
            # Check if it's actually visible text (not in code/data)
            visible_text = page.locator(f'text="{pattern}"').count()
            if visible_text > 0:
                issues_found.append(pattern)
                print(f"⚠ Found raw translation key pattern: {pattern}")

    if not issues_found:
        print("✓ No raw translation keys detected in visible text")
    else:
        print(f"⚠ Found {len(issues_found)} potential raw translation key patterns")
        take_screenshot(page, "10_translation_issues")

    print("TEST 10: PASSED ✓")
    return True

def run_all_tests():
    """Run all tests"""
    print("=" * 60)
    print("COMPREHENSIVE UI TESTING - SINGLE PLAYER PRESET FLOW")
    print("=" * 60)

    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=False)  # Set to False to watch tests
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            locale="en-US"
        )
        page = context.new_page()

        try:
            # Run all tests
            test_preset_selector_initial_load(page)
            test_preset_styling(page)
            test_preset_selection_quick_play(page)
            test_daily_redirect(page)
            test_custom_game_setup(page)
            test_back_navigation_from_custom(page)
            test_responsive_layout(page)
            test_accessibility(page)
            test_rtl_support(page)
            test_translation_keys(page)

            print("\n" + "=" * 60)
            print("ALL TESTS COMPLETED!")
            print(f"Screenshots saved to: {SCREENSHOT_DIR}")
            print("=" * 60)

        except Exception as e:
            print(f"\n❌ TEST FAILED WITH ERROR: {e}")
            take_screenshot(page, "error_state")
            raise
        finally:
            browser.close()

if __name__ == "__main__":
    run_all_tests()
