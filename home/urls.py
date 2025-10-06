from django.contrib import admin
from django.urls import path
from .views import home, upload, export_data

urlpatterns = [
    path('', home, name='home'),
    path('upload/', upload, name='upload'),
    path('export_data/', export_data, name='export_data')
]
