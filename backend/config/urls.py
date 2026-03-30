from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('apps.equipos.urls')),
    path('api/', include('apps.informes.urls')),
    path('api/', include('apps.programas.urls')),
    path('api/', include('apps.predictivo.urls')),
    path('', include('apps.equipos.urls_web')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
