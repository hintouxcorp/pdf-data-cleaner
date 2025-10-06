from django.http import JsonResponse, HttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
import pdfplumber
import json
import pandas as pd
import io
from pypdf import PdfReader
from openpyxl import Workbook

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import pdfplumber
import pandas as pd

@csrf_exempt
def upload(request):
    if request.method != 'POST':
        return JsonResponse({'erro': 'Método inválido'}, status=405)

    arquivo = request.FILES.get('arquivo')
    if not arquivo:
        return JsonResponse({'erro': 'Nenhum arquivo enviado'}, status=400)

    try:
        all_tables = []

        with pdfplumber.open(arquivo) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                # Tenta extrair tabela
                table = page.extract_table()
                if table:
                    # Adiciona cabeçalho + linhas
                    all_tables.append({
                        'page': i,
                        'headers': table[0],
                        'rows': table[1:]
                    })

        if not all_tables:
            # Nenhuma tabela encontrada, extrai texto bruto
            with pdfplumber.open(arquivo) as pdf:
                texto = "\n".join(page.extract_text() or '' for page in pdf.pages)
            return JsonResponse({
                'mensagem': f'{arquivo.name} processado (texto bruto extraído)',
                'conteudo': texto[:1000]  # limita para preview
            })

        # Se houver tabelas, junta todas em um único DataFrame (para amostra)
        merged_rows = []
        headers = all_tables[0]['headers']

        for t in all_tables:
            if t['headers'] == headers:
                merged_rows.extend(t['rows'])
            else:
                # Ajusta colunas diferentes
                df_temp = pd.DataFrame(t['rows'], columns=t['headers'])
                merged_rows.extend(df_temp.reindex(columns=headers, fill_value='').values.tolist())

        df = pd.DataFrame(merged_rows, columns=headers)

        # Retorna amostra para frontend
        amostra = df.head(10).to_dict(orient='records')

        return JsonResponse({
            'mensagem': f'{arquivo.name} processado com sucesso!',
            'headers': headers,
            'rows': amostra,
            'total_rows': len(df)
        })

    except Exception as e:
        return JsonResponse({'erro': str(e)}, status=500)


@csrf_exempt
def export_data(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)  # Recebe JSON
            formato = request.GET.get('formato', 'csv')  # csv ou xlsx

            if not data or 'rows' not in data:
                return JsonResponse({'erro': 'Nenhum dado recebido'}, status=400)

            # Transformar em DataFrame
            df = pd.DataFrame(data['rows'])

            # Gerar arquivo em memória
            if formato.lower() == 'xlsx':
                output = io.BytesIO()
                with pd.ExcelWriter(output, engine='openpyxl') as writer:
                    df.to_excel(writer, index=False, sheet_name='Data')
                output.seek(0)
                response = HttpResponse(output.read(),
                                        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                response['Content-Disposition'] = 'attachment; filename="extracted_data.xlsx"'
                return response

            else:  # CSV
                output = io.StringIO()
                df.to_csv(output, index=False)
                response = HttpResponse(output.getvalue(), content_type='text/csv')
                response['Content-Disposition'] = 'attachment; filename="extracted_data.csv"'
                return response

        except Exception as e:
            return JsonResponse({'erro': str(e)}, status=500)

    return JsonResponse({'erro': 'Método inválido'}, status=405)

def home(request):
    return render(request, 'home/index.html')