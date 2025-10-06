from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
import pdfplumber

@csrf_exempt
def upload(request):
    if request.method == 'POST':
        arquivo = request.FILES.get('arquivo')
        if not arquivo:
            return JsonResponse({'erro': 'Nenhum arquivo enviado'}, status=400)

        with pdfplumber.open(arquivo) as pdf:
            texto = "\n".join(page.extract_text() or '' for page in pdf.pages)

        return JsonResponse({'mensagem': f'{arquivo.name} recebido', 'conteudo': texto[:500]})
    return JsonResponse({'erro': 'Método inválido'}, status=405)

def home(request):
    return render(request, 'home/index.html')