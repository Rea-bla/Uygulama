import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("smartscan.exceptions")


class SmartScanException(Exception):
    def __init__(self, message: str, status_code: int = 500, error_code: str = "INTERNAL_ERROR"):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(self.message)


class ProductNotFoundException(SmartScanException):
    def __init__(self, product_id: str):
        super().__init__(
            message=f"Ürün bulunamadı: {product_id}",
            status_code=404,
            error_code="PRODUCT_NOT_FOUND"
        )


class ScraperTimeoutException(SmartScanException):
    def __init__(self, site_name: str, timeout_seconds: int):
        super().__init__(
            message=f"{site_name} sitesinden veri çekilirken zaman aşımı ({timeout_seconds}s)",
            status_code=504,
            error_code="SCRAPER_TIMEOUT"
        )


class ScraperBlockedException(SmartScanException):
    def __init__(self, site_name: str):
        super().__init__(
            message=f"{site_name} sitesi tarafından geçici olarak engellendiniz",
            status_code=503,
            error_code="SCRAPER_BLOCKED"
        )


class InvalidSearchQueryException(SmartScanException):
    def __init__(self, query: str, reason: str = ""):
        detail = f"Geçersiz arama sorgusu: '{query}'"
        if reason:
            detail += f" - {reason}"
        super().__init__(
            message=detail,
            status_code=400,
            error_code="INVALID_QUERY"
        )


class UserAlreadyExistsException(SmartScanException):
    def __init__(self, email: str):
        super().__init__(
            message=f"Bu e-posta adresiyle kayıtlı bir kullanıcı zaten var: {email}",
            status_code=409,
            error_code="USER_ALREADY_EXISTS"
        )


class InvalidCredentialsException(SmartScanException):
    def __init__(self):
        super().__init__(
            message="E-posta adresi veya şifre hatalı",
            status_code=401,
            error_code="INVALID_CREDENTIALS"
        )


class TokenExpiredException(SmartScanException):
    def __init__(self):
        super().__init__(
            message="Oturum süresi doldu, lütfen tekrar giriş yapın",
            status_code=401,
            error_code="TOKEN_EXPIRED"
        )


class FavoriteAlreadyExistsException(SmartScanException):
    def __init__(self, url: str):
        super().__init__(
            message=f"Bu ürün zaten favorilerinizde: {url}",
            status_code=409,
            error_code="FAVORITE_ALREADY_EXISTS"
        )


class PriceAlertLimitException(SmartScanException):
    def __init__(self, max_alerts: int):
        super().__init__(
            message=f"Maksimum {max_alerts} fiyat alarmı oluşturabilirsiniz",
            status_code=429,
            error_code="PRICE_ALERT_LIMIT"
        )


class DatabaseConnectionException(SmartScanException):
    def __init__(self):
        super().__init__(
            message="Veritabanı bağlantısı kurulamadı, lütfen daha sonra tekrar deneyin",
            status_code=503,
            error_code="DATABASE_CONNECTION_ERROR"
        )


def register_exception_handlers(app: FastAPI):
    @app.exception_handler(SmartScanException)
    async def smartscan_exception_handler(request: Request, exc: SmartScanException):
        logger.error(
            f"SmartScan Error [{exc.error_code}]: {exc.message} "
            f"path={request.url.path}"
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": True,
                "error_code": exc.error_code,
                "message": exc.message,
                "path": str(request.url.path),
            }
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = []
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error.get("loc", []))
            errors.append({
                "field": field,
                "message": error.get("msg", "Doğrulama hatası"),
                "type": error.get("type", "unknown"),
            })

        logger.warning(
            f"Validation Error: {len(errors)} error(s) "
            f"path={request.url.path}"
        )

        return JSONResponse(
            status_code=422,
            content={
                "error": True,
                "error_code": "VALIDATION_ERROR",
                "message": "İstek doğrulama hatası",
                "details": errors,
                "path": str(request.url.path),
            }
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": True,
                "error_code": f"HTTP_{exc.status_code}",
                "message": exc.detail,
                "path": str(request.url.path),
            }
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.critical(
            f"Unhandled Exception: {type(exc).__name__}: {str(exc)[:500]} "
            f"path={request.url.path}",
            exc_info=True
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "error_code": "INTERNAL_SERVER_ERROR",
                "message": "Sunucu hatası oluştu, lütfen daha sonra tekrar deneyin",
                "path": str(request.url.path),
            }
        )
