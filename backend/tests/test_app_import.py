def test_app_imports_without_external_services():
    from app.main import app
    assert app is not None
    assert app.title == "WorkTwin API"
