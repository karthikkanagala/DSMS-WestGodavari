"""
Flask Application Factory — registers all blueprints and extensions.
"""
import os
from flask import Flask
from .extensions import mongo, jwt, cors
from .config import Config


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialise extensions
    mongo.init_app(app)
    jwt.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["FRONTEND_URL"]}},
        supports_credentials=True,
    )

    # Ensure upload directory exists
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    # Register blueprints
    from .auth.routes import auth_bp
    from .blueprints.setup.routes import setup_bp
    from .blueprints.districts.routes import districts_bp
    from .blueprints.mandals.routes import mandals_bp
    from .blueprints.wards.routes import wards_bp
    from .blueprints.bins.routes import bins_bp
    from .blueprints.collections.routes import collections_bp
    from .blueprints.overflow.routes import overflow_bp
    from .blueprints.analytics.routes import analytics_bp
    from .blueprints.reports.routes import reports_bp
    from .blueprints.notifications.routes import notifications_bp
    from .blueprints.users.routes import users_bp
    from .blueprints.backup.routes import backup_bp

    app.register_blueprint(auth_bp,          url_prefix="/api/auth")
    app.register_blueprint(setup_bp,         url_prefix="/api/setup")
    app.register_blueprint(districts_bp,     url_prefix="/api/districts")
    app.register_blueprint(mandals_bp,       url_prefix="/api/mandals")
    app.register_blueprint(wards_bp,         url_prefix="/api/wards")
    app.register_blueprint(bins_bp,          url_prefix="/api/bins")
    app.register_blueprint(collections_bp,   url_prefix="/api/collections")
    app.register_blueprint(overflow_bp,      url_prefix="/api/overflow")
    app.register_blueprint(analytics_bp,     url_prefix="/api/analytics")
    app.register_blueprint(reports_bp,       url_prefix="/api/reports")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
    app.register_blueprint(users_bp,         url_prefix="/api/users")
    app.register_blueprint(backup_bp,        url_prefix="/api/backup")

    # Auto-seed if database is empty
    with app.app_context():
        try:
            if mongo.db.users.count_documents({}) == 0:
                print("[DB] Empty database detected. Running seed script...")
                import subprocess, sys
                seed_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "seed", "seed.py")
                # Alternatively run seed directly in app context
                from seed.seed import run_seed
                run_seed(mongo.db)
        except Exception as e:
            print(f"[DB] Auto-seed status: {e}")

    @app.route("/api/health")
    def health():
        return {"status": "ok", "app": "DSMS v1.0"}

    return app
