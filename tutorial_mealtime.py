#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gera o PDF Tutorial do Sistema Meal Time"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

# ─── Cores do sistema ────────────────────────────────────────────────────────
VERMELHO      = colors.HexColor('#7B1A1A')
VERMELHO_DARK = colors.HexColor('#5E1212')
VERMELHO_LIGHT= colors.HexColor('#fff5f5')
CINZA_CLARO   = colors.HexColor('#F8FAFC')
CINZA_BORDA   = colors.HexColor('#E2E8F0')
CINZA_TEXTO   = colors.HexColor('#475569')
VERDE         = colors.HexColor('#166534')
VERDE_BG      = colors.HexColor('#F0FDF4')
AMARELO       = colors.HexColor('#92400E')
AMARELO_BG    = colors.HexColor('#FFFBEB')
AZUL          = colors.HexColor('#1E40AF')
WHITE         = colors.white
BLACK         = colors.HexColor('#1E293B')

def build_styles():
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name='CoverTitle',
        fontName='Helvetica-Bold',
        fontSize=28,
        textColor=WHITE,
        alignment=TA_CENTER,
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name='CoverSubtitle',
        fontName='Helvetica',
        fontSize=13,
        textColor=colors.HexColor('#FECACA'),
        alignment=TA_CENTER,
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        name='SectionTitle',
        fontName='Helvetica-Bold',
        fontSize=15,
        textColor=WHITE,
        spaceBefore=4,
        spaceAfter=4,
        leftIndent=0,
    ))
    styles.add(ParagraphStyle(
        name='SubSection',
        fontName='Helvetica-Bold',
        fontSize=11,
        textColor=VERMELHO,
        spaceBefore=10,
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        name='Body',
        fontName='Helvetica',
        fontSize=10,
        textColor=BLACK,
        leading=15,
        spaceBefore=3,
        spaceAfter=3,
        alignment=TA_JUSTIFY,
    ))
    styles.add(ParagraphStyle(
        name='BulletItem',
        fontName='Helvetica',
        fontSize=10,
        textColor=BLACK,
        leading=14,
        leftIndent=12,
        spaceBefore=2,
        spaceAfter=2,
    ))
    styles.add(ParagraphStyle(
        name='CodeBox',
        fontName='Courier',
        fontSize=9,
        textColor=VERMELHO_DARK,
        leading=13,
        leftIndent=8,
        spaceBefore=2,
        spaceAfter=2,
    ))
    styles.add(ParagraphStyle(
        name='Note',
        fontName='Helvetica-Oblique',
        fontSize=9,
        textColor=CINZA_TEXTO,
        leading=13,
        spaceBefore=2,
        spaceAfter=2,
    ))
    styles.add(ParagraphStyle(
        name='FlowStep',
        fontName='Helvetica-Bold',
        fontSize=10,
        textColor=VERMELHO,
        alignment=TA_CENTER,
        spaceAfter=2,
    ))
    return styles

def section_header(title, styles):
    """Retorna tabela colorida de cabeçalho de seção."""
    tbl = Table([[Paragraph(title, styles['SectionTitle'])]], colWidths=[17*cm])
    tbl.setStyle(TableStyle([
        ('BACKGROUND',  (0,0), (-1,-1), VERMELHO),
        ('ROWPADDING',  (0,0), (-1,-1), 8),
        ('BOX',         (0,0), (-1,-1), 0, WHITE),
        ('ROUNDEDCORNERS', [6]),
    ]))
    return tbl

def info_box(content_rows, styles, bg=CINZA_CLARO, border=CINZA_BORDA):
    """Cria uma caixa de informações com linhas de texto."""
    rows = [[Paragraph(r, styles['BulletItem'])] for r in content_rows]
    tbl = Table(rows, colWidths=[17*cm])
    tbl.setStyle(TableStyle([
        ('BACKGROUND',  (0,0), (-1,-1), bg),
        ('BOX',         (0,0), (-1,-1), 0.5, border),
        ('ROWPADDING',  (0,0), (-1,-1), 5),
    ]))
    return tbl

def flow_table(steps, styles):
    """Tabela do fluxo do sistema."""
    rows = []
    for i, step in enumerate(steps):
        rows.append([Paragraph(step, styles['FlowStep'])])
        if i < len(steps) - 1:
            rows.append([Paragraph('<font color="#9CA3AF">&#9660;</font>', ParagraphStyle(
                'Arrow', fontName='Helvetica', fontSize=12,
                alignment=TA_CENTER, textColor=colors.HexColor('#9CA3AF')
            ))])
    tbl = Table(rows, colWidths=[17*cm])
    tbl.setStyle(TableStyle([
        ('BACKGROUND',  (0,0), (-1,-1), VERMELHO_LIGHT),
        ('BOX',         (0,0), (-1,-1), 1, VERMELHO),
        ('ROWPADDING',  (0,0), (-1,-1), 5),
        ('ALIGN',       (0,0), (-1,-1), 'CENTER'),
    ]))
    return tbl

def status_table(statuses, styles):
    """Mini tabela de status coloridos."""
    status_colors = {
        'Pendente':              ('#FEF3C7', '#92400E'),
        'Gerado':                ('#DBEAFE', '#1E40AF'),
        'Aguardando Aprovacao':  ('#FEF9C3', '#713F12'),
        'Aprovado':              ('#DCFCE7', '#166534'),
        'Reprovado':             ('#FEE2E2', '#991B1B'),
        'Em Producao':           ('#EDE9FE', '#5B21B6'),
        'Concluido':             ('#D1FAE5', '#065F46'),
        'Cancelado':             ('#F1F5F9', '#64748B'),
    }
    data = []
    row = []
    for i, s in enumerate(statuses):
        bg, txt = status_colors.get(s, ('#F1F5F9', '#374151'))
        cell = Paragraph(
            f'<font color="{txt}"><b>{s}</b></font>',
            ParagraphStyle('S', fontName='Helvetica-Bold', fontSize=8,
                           alignment=TA_CENTER, textColor=colors.HexColor(txt))
        )
        row.append(cell)
        if len(row) == 4 or i == len(statuses) - 1:
            while len(row) < 4:
                row.append(Paragraph('', styles['Body']))
            data.append(row)
            row = []

    col_w = [4.25*cm] * 4
    tbl = Table(data, colWidths=col_w)
    style_cmds = [
        ('ROWPADDING',  (0,0), (-1,-1), 6),
        ('ALIGN',       (0,0), (-1,-1), 'CENTER'),
        ('GRID',        (0,0), (-1,-1), 0.5, CINZA_BORDA),
    ]
    for i, s in enumerate(statuses):
        bg, _ = status_colors.get(s, ('#F1F5F9', '#374151'))
        row_i = i // 4
        col_i = i % 4
        style_cmds.append(('BACKGROUND', (col_i, row_i), (col_i, row_i), colors.HexColor(bg)))
    tbl.setStyle(TableStyle(style_cmds))
    return tbl


def main():
    output_path = '/Users/talisonbraga/projeto-dietas/Tutorial_MealTime.pdf'
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm,   bottomMargin=2*cm,
        title='Tutorial — Sistema de Dietas Personalizadas Meal Time',
        author='Meal Time Ultracongelados',
    )

    styles = build_styles()
    story  = []

    # ── CAPA ─────────────────────────────────────────────────────────────────
    capa = Table(
        [[Paragraph('MEAL TIME', styles['CoverTitle'])],
         [Paragraph('Ultracongelados', styles['CoverSubtitle'])],
         [Spacer(1, 10)],
         [Paragraph('Tutorial do Sistema de Dietas Personalizadas', ParagraphStyle(
             'CT2', fontName='Helvetica-Bold', fontSize=14,
             textColor=colors.HexColor('#FECACA'), alignment=TA_CENTER
         ))],
         [Spacer(1, 6)],
         [Paragraph('Guia completo de todas as funcionalidades', ParagraphStyle(
             'CT3', fontName='Helvetica', fontSize=11,
             textColor=colors.HexColor('#FCA5A5'), alignment=TA_CENTER
         ))],
        ],
        colWidths=[17*cm]
    )
    capa.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,-1), VERMELHO),
        ('ROWPADDING',   (0,0), (-1,-1), 10),
        ('TOPPADDING',   (0,0), (-1,0),  30),
        ('BOTTOMPADDING',(0,-1),(-1,-1), 30),
        ('ROUNDEDCORNERS', [10]),
    ]))
    story.append(capa)
    story.append(Spacer(1, 20))

    # URL e data
    story.append(Paragraph(
        '<b>URL do sistema:</b> https://charismatic-friendship-production-b81d.up.railway.app',
        ParagraphStyle('URL', fontName='Courier', fontSize=9, textColor=CINZA_TEXTO)
    ))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width='100%', thickness=1, color=CINZA_BORDA))
    story.append(Spacer(1, 10))

    # ── FLUXO GERAL ──────────────────────────────────────────────────────────
    story.append(section_header('Fluxo Geral do Sistema', styles))
    story.append(Spacer(1, 8))

    flow_steps = [
        '1. Cadastrar Cliente',
        '2. Configurar Base Alimentar (Grupos, Alimentos, Preparos)',
        '3. Criar Pedido com proteinas, carboidratos, leguminosas e legumes',
        '4. Gerar Cardapio automaticamente',
        '5. Editar lotes manualmente (nome, gramagem, OBS, molho)',
        '6. Enviar para Aprovacao do cliente',
        '7. Aprovar na aba Aprovacoes',
        '8. Gerar Ordem de Producao',
        '9. Imprimir Plano de Producao + Descritivo Individual',
        '10. Registrar Valor do Pedido → LTV acumula no perfil do cliente',
    ]
    story.append(flow_table(flow_steps, styles))
    story.append(Spacer(1, 16))

    # ── 1. LOGIN ─────────────────────────────────────────────────────────────
    story.append(section_header('1. Login', styles))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        'Acesse a URL do sistema. Sera exibida a tela de login com os campos <b>Usuario</b> e <b>Senha</b>.',
        styles['Body']
    ))
    story.append(Spacer(1, 4))
    story.append(info_box([
        '• Campo "Usuario": digite o nome de usuario fornecido pelo administrador',
        '• Campo "Senha": digite a senha',
        '• Clique em Entrar para acessar o sistema',
        '• A sessao expira em 12 horas — faca login novamente se necessario',
    ], styles))
    story.append(Spacer(1, 16))

    # ── 2. DASHBOARD ─────────────────────────────────────────────────────────
    story.append(section_header('2. Dashboard', styles))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        'Tela inicial com visao geral do negocio em tempo real.',
        styles['Body']
    ))
    story.append(Spacer(1, 6))

    dash_data = [
        ['Indicador', 'O que mostra'],
        ['Total de Clientes', 'Quantidade de clientes cadastrados no sistema'],
        ['Preparos Cadastrados', 'Total de modos de preparo ativos na Base Alimentar'],
        ['Pedidos Pendentes', 'Pedidos aguardando acao (geracao de cardapio etc.)'],
        ['Ordens em Producao', 'Ordens com status Em Andamento na fabrica'],
    ]
    dash_tbl = Table(dash_data, colWidths=[6*cm, 11*cm])
    dash_tbl.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,0),  VERMELHO),
        ('TEXTCOLOR',    (0,0), (-1,0),  WHITE),
        ('FONTNAME',     (0,0), (-1,0),  'Helvetica-Bold'),
        ('FONTSIZE',     (0,0), (-1,-1), 9),
        ('ROWPADDING',   (0,0), (-1,-1), 6),
        ('GRID',         (0,0), (-1,-1), 0.5, CINZA_BORDA),
        ('BACKGROUND',   (0,1), (-1,-1), CINZA_CLARO),
        ('ROWBACKGROUNDS',(0,1),(-1,-1), [WHITE, CINZA_CLARO]),
    ]))
    story.append(dash_tbl)
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        'Abaixo dos indicadores: <b>Pedidos Recentes</b> (tabela com status de cada um), '
        '<b>Acesso Rapido</b> (botoes para criar cliente/pedido/base) e '
        '<b>Fluxo do Sistema</b> resumido.',
        styles['Body']
    ))
    story.append(Spacer(1, 16))

    # ── 3. CLIENTES ──────────────────────────────────────────────────────────
    story.append(section_header('3. Clientes', styles))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        'Gerenciamento completo da carteira de clientes da Meal Time.',
        styles['Body']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph('3.1 Lista de Clientes', styles['SubSection']))
    story.append(info_box([
        '• Busca em tempo real por nome, e-mail ou telefone',
        '• Colunas: Nome, E-mail, Telefone, Pedidos',
        '• Acoes por cliente: Ver (perfil completo), Editar, Excluir',
        '• Botao "+ Novo Cliente" no canto superior direito',
    ], styles))

    story.append(Spacer(1, 8))
    story.append(Paragraph('3.2 Perfil do Cliente', styles['SubSection']))
    story.append(info_box([
        '• Card vermelho com avatar (iniciais), nome, e-mail, telefone e data de cadastro',
        '• Estatisticas: pedidos totais | em andamento | ultimo pedido | LTV total (R$)',
        '• LTV = soma de todos os valores de pedidos registrados para este cliente',
        '• Observacoes (alergias, restricoes etc.) aparecem em destaque no card',
        '• Historico de Pedidos: data, pratos, valor, status, aprovacao, ordem',
        '• Botoes rapidos: + Novo Pedido | Repetir Ultimo Pedido',
    ], styles))
    story.append(Spacer(1, 16))

    # ── 4. BASE ALIMENTAR ────────────────────────────────────────────────────
    story.append(section_header('4. Base Alimentar', styles))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        'Cadastro de todos os ingredientes e modos de preparo disponíveis para composicao dos pedidos.',
        styles['Body']
    ))
    story.append(Spacer(1, 6))

    grupos_data = [
        ['Grupo', 'Funcao no prato', 'Exemplos'],
        ['Proteina',    'Fonte proteica principal',        'Frango, Carne Bovina, Salmao'],
        ['Carboidrato', 'Fonte de energia',                'Arroz Branco, Arroz Integral, Batata Doce'],
        ['Leguminosa',  'Proteina vegetal + fibras',       'Feijao Preto, Lentilha, Grao-de-bico'],
        ['Legume',      'Micronutrientes + volume',        'Abobrinha, Brocolis, Mix variado de vegetais'],
        ['Molho',       'Complemento adicionado pos-pedido','Molho Gorgonzola, Molho Branco, Molho Madeira'],
    ]
    grupos_tbl = Table(grupos_data, colWidths=[3.5*cm, 6.5*cm, 7*cm])
    grupos_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,0),  VERMELHO),
        ('TEXTCOLOR',     (0,0), (-1,0),  WHITE),
        ('FONTNAME',      (0,0), (-1,0),  'Helvetica-Bold'),
        ('FONTSIZE',      (0,0), (-1,-1), 9),
        ('ROWPADDING',    (0,0), (-1,-1), 6),
        ('GRID',          (0,0), (-1,-1), 0.5, CINZA_BORDA),
        ('ROWBACKGROUNDS',(0,1), (-1,-1), [WHITE, CINZA_CLARO]),
    ]))
    story.append(grupos_tbl)
    story.append(Spacer(1, 6))

    story.append(Paragraph('Como gerenciar a Base Alimentar:', styles['SubSection']))
    story.append(info_box([
        '• Clique em "+ Novo Alimento" para cadastrar um alimento em qualquer grupo',
        '• Cada alimento mostra quantos preparos tem (badge vermelho com numero)',
        '• Para adicionar um preparo: clique no campo abaixo do alimento e clique "+ Preparo"',
        '• Botao "Desativar" tira o alimento/preparo do pool de selecao sem excluir',
        '• Botao "Editar" permite renomear o alimento ou alterar o grupo',
        '• IMPORTANTE: Legumes com "Mix variado de vegetais" ativam campo de OBS no pedido',
    ], styles))
    story.append(Spacer(1, 16))

    # ── 5. PEDIDOS ───────────────────────────────────────────────────────────
    story.append(section_header('5. Pedidos', styles))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        'Modulo central do sistema. Todo o fluxo de personalizacao de dietas passa pelos pedidos.',
        styles['Body']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph('5.1 Status dos Pedidos', styles['SubSection']))
    story.append(status_table(
        ['Pendente', 'Gerado', 'Aguardando Aprovacao', 'Aprovado',
         'Reprovado', 'Em Producao', 'Concluido', 'Cancelado'],
        styles
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph('5.2 Criando um Novo Pedido', styles['SubSection']))
    novo_pedido_data = [
        ['Campo', 'Descricao'],
        ['Cliente', 'Seleciona o cliente da lista cadastrada'],
        ['Nutricionista', 'Nome do profissional responsavel pelo plano'],
        ['Total de Pratos', 'Quantidade total de marmitas (minimo 5)'],
        ['Max. Repeticoes', 'Quantas vezes o mesmo preparo pode aparecer'],
        ['Min. por Lote', 'Minimo de pratos identicos por lote (padrao 2)'],
        ['Proteinas', 'Alimento + gramagem + qtd de pratos + preparos permitidos'],
        ['Carboidrato', 'Gramagem de referencia + preparos permitidos'],
        ['Leguminosa', 'Gramagem + preparos permitidos'],
        ['Legume', 'Opcional: gramagem + preparos (Mix variado libera campo OBS)'],
        ['Observacoes', 'Notas gerais sobre o pedido (alergias, restricoes etc.)'],
    ]
    np_tbl = Table(novo_pedido_data, colWidths=[5*cm, 12*cm])
    np_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,0),  VERMELHO),
        ('TEXTCOLOR',     (0,0), (-1,0),  WHITE),
        ('FONTNAME',      (0,0), (-1,0),  'Helvetica-Bold'),
        ('FONTSIZE',      (0,0), (-1,-1), 9),
        ('ROWPADDING',    (0,0), (-1,-1), 5),
        ('GRID',          (0,0), (-1,-1), 0.5, CINZA_BORDA),
        ('ROWBACKGROUNDS',(0,1), (-1,-1), [WHITE, CINZA_CLARO]),
    ]))
    story.append(np_tbl)
    story.append(Spacer(1, 8))

    story.append(Paragraph('5.3 Detalhe do Pedido', styles['SubSection']))
    story.append(info_box([
        '• Informacoes: cliente, nutricionista, status, data e numero de pratos',
        '• Distribuicao de Proteinas: cada alimento com seus preparos selecionados',
        '• Secao "Acoes": botoes para avancar o status do pedido (ver fluxo abaixo)',
        '• Secao "Aprovacao": status e data da aprovacao do cliente',
        '• Secao "Financeiro": campo para informar o valor (R$) do pedido',
        '  — Ao salvar, exibe badge verde com valor formatado em reais',
        '  — O valor acumula no LTV do cliente automaticamente',
        '• Cardapio por versao: cada geracao gera uma versao (v1, v2...)',
        '  — Versao ativa e a que vai para producao',
    ], styles))
    story.append(Spacer(1, 8))

    story.append(Paragraph('5.4 Editando Lotes do Cardapio', styles['SubSection']))
    story.append(info_box([
        '• Clique em "Editar" no lote para entrar no modo de edicao',
        '• Nome do item: pode ser renomeado livremente (ex: "Frango na Mostarda")',
        '  — Item editado aparece com badge "editado" em laranja',
        '• Gramagem: pode ser alterada diretamente',
        '• OBS: campo de observacao com destaque amarelo (ex: "CUIDADO COM A CEBOLA")',
        '• Adicionar Molho: selecione um dos molhos cadastrados para o lote',
        '• Clique "Salvar" para confirmar ou "Cancelar" para descartar alteracoes',
    ], styles))
    story.append(Spacer(1, 16))

    # ── 6. APROVAÇÕES ────────────────────────────────────────────────────────
    story.append(section_header('6. Aprovacoes', styles))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        'Modulo de revisao do cardapio gerado antes de ir para a producao.',
        styles['Body']
    ))
    story.append(Spacer(1, 6))
    story.append(info_box([
        '• Lista todos os pedidos com status "Aguardando Aprovacao"',
        '• Para cada pedido: exibe cliente, data, pratos e o cardapio gerado',
        '• Botao "Aprovar Pedido": avanca para status Aprovado',
        '• Botao "Reprovar": volta o pedido para edicao (pode regerar o cardapio)',
        '• Quando vazia: exibe mensagem e link para ver todos os pedidos',
        '• Historico de aprovacoes acessivel pelo botao "Ver todos os pedidos com historico"',
    ], styles))
    story.append(Spacer(1, 16))

    # ── 7. PRODUCAO ──────────────────────────────────────────────────────────
    story.append(section_header('7. Producao', styles))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        'Central de gestao das ordens de producao. Acessivel apos aprovacao do pedido.',
        styles['Body']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph('7.1 Lista de Ordens', styles['SubSection']))
    story.append(info_box([
        '• Filtros: Todos | Pendente | Em Andamento | Concluida | Cancelada',
        '• Colunas: Cliente, Gerado em, Previsao de Entrega, Pratos, Preparos, Status, Acoes',
        '• Campo "Previsao" e editavel diretamente na tabela',
        '• Botao "Somatorio" abre o detalhamento completo da ordem',
    ], styles))

    story.append(Spacer(1, 8))
    story.append(Paragraph('7.2 Somatorio de Producao', styles['SubSection']))

    abas_data = [
        ['Aba', 'Conteudo', 'Uso'],
        ['Insumos',   'Tabela consolidada: Alimento + Preparo + g/prato + Pratos + Total\nSubtotal por grupo (Proteina, Carb, Leguminosa...) e Total Geral em kg', 'Lista de compras e separacao de ingredientes'],
        ['Montagem',  'Descritivo por lote: Grupo | Preparo | Gramagem por item\nMostra nomes editados e OBS em destaque amarelo',                               'Roteiro de montagem individual das marmitas'],
        ['Imprimir',  'Selecao do documento: Plano de Producao ou Descritivo Individual\nBotoes "Imprimir" e "Salvar PDF" (usa impressao do browser)',            'Exportar documentos para producao'],
    ]
    abas_tbl = Table(abas_data, colWidths=[3*cm, 9*cm, 5*cm])
    abas_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,0),  VERMELHO),
        ('TEXTCOLOR',     (0,0), (-1,0),  WHITE),
        ('FONTNAME',      (0,0), (-1,0),  'Helvetica-Bold'),
        ('FONTSIZE',      (0,0), (-1,-1), 8.5),
        ('ROWPADDING',    (0,0), (-1,-1), 6),
        ('GRID',          (0,0), (-1,-1), 0.5, CINZA_BORDA),
        ('ROWBACKGROUNDS',(0,1), (-1,-1), [WHITE, CINZA_CLARO]),
        ('VALIGN',        (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(abas_tbl)
    story.append(Spacer(1, 6))

    story.append(Paragraph('7.3 Como imprimir / salvar em PDF', styles['SubSection']))
    story.append(info_box([
        '1. Na aba "Imprimir", selecione o documento desejado (Plano ou Descritivo)',
        '2. Clique em "Imprimir" ou "Salvar PDF"',
        '3. O browser abre o dialogo de impressao nativo do sistema operacional',
        '4. Para salvar em PDF: no dialogo, escolha "Salvar como PDF" como impressora',
        '5. O documento e formatado automaticamente sem sidebar nem botoes',
    ], styles))
    story.append(Spacer(1, 16))

    # ── 8. FINANCEIRO ────────────────────────────────────────────────────────
    story.append(section_header('8. Financeiro e LTV', styles))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        'Controle financeiro basico integrado ao perfil de cada cliente.',
        styles['Body']
    ))
    story.append(Spacer(1, 6))
    story.append(info_box([
        '• No detalhe do pedido, role ate a secao "Financeiro"',
        '• Digite o valor cobrado em R$ (aceita virgula ou ponto decimal)',
        '• Clique "Salvar" — o badge verde exibe o valor formatado imediatamente',
        '• O valor e associado ao pedido e aparece na tabela do perfil do cliente',
        '• LTV Total = soma automatica de todos os valores salvos nos pedidos do cliente',
        '• Ideal para registrar apos confirmacao do pagamento pelo cliente',
    ], styles, bg=VERDE_BG, border=colors.HexColor('#BBF7D0')))
    story.append(Spacer(1, 16))

    # ── 9. DICAS RAPIDAS ─────────────────────────────────────────────────────
    story.append(section_header('9. Dicas Rapidas', styles))
    story.append(Spacer(1, 8))

    dicas_data = [
        ['Situacao', 'O que fazer'],
        ['Cliente novo chegou',                     'Clientes → + Novo Cliente → preencher dados → criar pedido'],
        ['Repetir dieta de um cliente',             'Perfil do cliente → "Repetir ultimo" → ajustar se necessario'],
        ['Cardapio precisa de ajuste manual',       'Pedido → Editar lote → renomear, alterar gramagem, adicionar OBS'],
        ['Adicionar molho a um lote',               'Pedido → Editar lote → selecionar molho na lista → Salvar'],
        ['Cliente aprovou por fora',                'Aprovacoes → Aprovar Pedido (ou direto no detalhe do pedido)'],
        ['Precisou refazer o cardapio',             'Pedido → Gerar Cardapio → nova versao e criada automaticamente'],
        ['Alimento precisa de novo preparo',        'Base Alimentar → campo do alimento → digitar nome → + Preparo'],
        ['Ver total de insumos para comprar',       'Producao → Somatorio → aba Insumos → coluna Total'],
        ['Gerar lista de montagem para a cozinha',  'Producao → Somatorio → aba Imprimir → Descritivo Individual → PDF'],
    ]
    dicas_tbl = Table(dicas_data, colWidths=[6.5*cm, 10.5*cm])
    dicas_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,0),  VERMELHO),
        ('TEXTCOLOR',     (0,0), (-1,0),  WHITE),
        ('FONTNAME',      (0,0), (-1,0),  'Helvetica-Bold'),
        ('FONTSIZE',      (0,0), (-1,-1), 8.5),
        ('ROWPADDING',    (0,0), (-1,-1), 6),
        ('GRID',          (0,0), (-1,-1), 0.5, CINZA_BORDA),
        ('ROWBACKGROUNDS',(0,1), (-1,-1), [WHITE, CINZA_CLARO]),
        ('VALIGN',        (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(dicas_tbl)
    story.append(Spacer(1, 16))

    # ── RODAPÉ ───────────────────────────────────────────────────────────────
    story.append(HRFlowable(width='100%', thickness=1, color=CINZA_BORDA))
    story.append(Spacer(1, 6))
    rodape = Table(
        [[Paragraph('<b>Meal Time Ultracongelados</b> — Sistema de Dietas Personalizadas', ParagraphStyle(
            'RodL', fontName='Helvetica', fontSize=8, textColor=CINZA_TEXTO
        )),
          Paragraph('v1.0 · 2026', ParagraphStyle(
            'RodR', fontName='Helvetica', fontSize=8, textColor=CINZA_TEXTO, alignment=TA_CENTER
          ))]],
        colWidths=[13*cm, 4*cm]
    )
    story.append(rodape)

    doc.build(story)
    print(f'PDF gerado: {output_path}')


if __name__ == '__main__':
    main()
