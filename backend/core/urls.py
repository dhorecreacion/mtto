from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse

@api_view(['GET'])
def api_root(request, format=None):
    return Response({
        'token':      reverse('token_obtain_pair', request=request),
        'accounts':   reverse('registro', request=request),
        'activos':    request.build_absolute_uri('/api/activos/'),
        'preventivo': request.build_absolute_uri('/api/preventivo/'),
        'correctivo': request.build_absolute_uri('/api/correctivo/'),
    })

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth JWT — login y renovación de token
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Apps
    path('api/', api_root, name='api-root'),
    path('api/accounts/', include('accounts.urls')),
    path('api/activos/', include('activos.urls')),
    path('api/preventivo/', include('preventivo.urls')),
    path('api/correctivo/', include('correctivo.urls')),
    path('api/reportes/', include('reportes.urls')),
    path('api-auth/', include('rest_framework.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
