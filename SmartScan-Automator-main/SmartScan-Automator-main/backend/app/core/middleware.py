import time
import logging
from collections import defaultdict
from typing import Callable
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("smartscan.middleware")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        client_ip = request.client.host if request.client else "unknown"
        method = request.method
        path = request.url.path
        query = str(request.url.query) if request.url.query else ""

        logger.info(
            f"[REQUEST] {method} {path}"
            f"{'?' + query if query else ''} "
            f"from {client_ip}"
        )

        try:
            response = await call_next(request)
        except Exception as exc:
            process_time = time.time() - start_time
            logger.error(
                f"[ERROR] {method} {path} "
                f"error={str(exc)[:200]} "
                f"duration={process_time:.3f}s"
            )
            raise

        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = f"{process_time:.4f}"
        response.headers["X-Request-ID"] = f"{int(time.time() * 1000)}"

        log_level = logging.WARNING if response.status_code >= 400 else logging.INFO
        logger.log(
            log_level,
            f"[RESPONSE] {method} {path} "
            f"status={response.status_code} "
            f"duration={process_time:.3f}s "
            f"from {client_ip}"
        )

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 60, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.request_counts = defaultdict(list)

    def _clean_old_requests(self, client_ip: str, current_time: float):
        cutoff = current_time - self.window_seconds
        self.request_counts[client_ip] = [
            t for t in self.request_counts[client_ip] if t > cutoff
        ]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()

        self._clean_old_requests(client_ip, current_time)

        if len(self.request_counts[client_ip]) >= self.max_requests:
            remaining_time = int(
                self.window_seconds - (current_time - self.request_counts[client_ip][0])
            )
            logger.warning(
                f"[RATE_LIMIT] Client {client_ip} exceeded "
                f"{self.max_requests} requests in {self.window_seconds}s"
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Çok fazla istek gönderdiniz. {remaining_time} saniye sonra tekrar deneyin.",
                headers={
                    "Retry-After": str(remaining_time),
                    "X-RateLimit-Limit": str(self.max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(current_time + remaining_time)),
                }
            )

        self.request_counts[client_ip].append(current_time)

        response = await call_next(request)

        remaining = self.max_requests - len(self.request_counts[client_ip])
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(
            int(current_time + self.window_seconds)
        )

        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), "
            "payment=(), usb=(), magnetometer=()"
        )
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"

        return response
