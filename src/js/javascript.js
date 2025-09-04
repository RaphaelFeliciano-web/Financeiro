document.addEventListener('DOMContentLoaded', () => {
    // Objeto para centralizar a seleção de elementos do DOM
    const DOM = {
        // Elementos gerenciados pelo transaction.js
        saldoAtual: document.getElementById('saldoAtual'),
        dividaCartao: document.getElementById('dividaCartao'),
        transacoesLista: document.getElementById('transacoesLista'),
        formTransacao: document.getElementById('formTransacao'),
        descricaoInput: document.getElementById('descricao'),
        valorInput: document.getElementById('valor'),
        categoriaInput: document.getElementById('categoria'),
        addTransactionBtn: document.getElementById('addTransactionBtn'),
        cancelEditBtn: document.getElementById('cancelEditBtn'),
        tipoRadios: document.querySelectorAll('input[name="tipo"]'),
        formaPagamentoRadios: document.querySelectorAll('input[name="forma_pagamento"]'),
        emptyStateMessage: document.getElementById('empty-state-message'),
        transacaoTemplate: document.getElementById('transacao-template'),
        btnLimparTudo: document.getElementById('btnLimparTudo'),
        btnExportar: document.getElementById('btnExportar'),
        btnExportarCSV: document.getElementById('btnExportarCSV'), // Novo botão para CSV
        notificationContainer: document.getElementById('notification-container'),
        filtroResumo: document.getElementById('filtro-resumo'),
        confirmationModal: document.getElementById('confirmation-modal'),
        confirmationMessage: document.getElementById('confirmation-message'),
        confirmBtnOk: document.getElementById('confirm-btn-ok'),
        confirmBtnCancel: document.getElementById('confirm-btn-cancel'),
        payBillModal: document.getElementById('pay-bill-modal'),
        valorFaturaInput: document.getElementById('valor-fatura'),
        payBillBtnOk: document.getElementById('pay-bill-btn-ok'),
        payBillBtnCancel: document.getElementById('pay-bill-btn-cancel'),

        // Elementos gerenciados pelo javascript.js
        themeToggleBtn: document.getElementById('theme-toggle-btn'),
        btnPagarFatura: document.getElementById('btnPagarFatura'),
        historicoFooter: document.getElementById('historico-footer'),
        btnMostrarMais: document.getElementById('btnMostrarMais'),
        filterButtonsContainer: document.querySelector('.filtros-transacoes'),
    };

    // Estado gerenciado pelo orquestrador
    const State = {
        currentTheme: localStorage.getItem('theme') || 'light',
    };

    /**
     * Função de inicialização.
     */
    const init = () => {
        // Aplica o tema salvo
        document.documentElement.setAttribute('data-theme', State.currentTheme);
        if (DOM.themeToggleBtn) {
            DOM.themeToggleBtn.textContent = State.currentTheme === 'light' ? '🌙' : '☀️';
        }

        // 1. Cria e inicializa o módulo especialista em transações
        const transactionManager = createTransactionManager(DOM);
        transactionManager.init();

        // 2. Adiciona os event listeners que este orquestrador gerencia
        const toggleTheme = () => {
            State.currentTheme = State.currentTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', State.currentTheme);
            localStorage.setItem('theme', State.currentTheme);
            if (DOM.themeToggleBtn) {
                DOM.themeToggleBtn.textContent = State.currentTheme === 'light' ? '🌙' : '☀️';
            }
        };

        if (DOM.themeToggleBtn) DOM.themeToggleBtn.addEventListener('click', toggleTheme);

        if (DOM.btnPagarFatura) {
            DOM.btnPagarFatura.addEventListener('click', () => {
                if (DOM.payBillModal) {
                    DOM.payBillModal.classList.remove('hidden');
                    if(DOM.valorFaturaInput) {
                        DOM.valorFaturaInput.value = '';
                        DOM.valorFaturaInput.focus();
                    }
                }
            });
        }
        if (DOM.payBillBtnCancel) DOM.payBillBtnCancel.addEventListener('click', () => {
            if (DOM.payBillModal) DOM.payBillModal.classList.add('hidden');
        });

        if (DOM.filterButtonsContainer) {
            DOM.filterButtonsContainer.addEventListener('click', (e) => {
                const target = e.target.closest('.filtro-btn');
                if (!target) return;

                // Atualiza o estilo do botão ativo
                DOM.filterButtonsContainer.querySelectorAll('.filtro-btn').forEach(btn => btn.classList.remove('active'));
                target.classList.add('active');

                // Aplica o filtro
                transactionManager.setFilter(target.dataset.filter);
            });
        }

        if (DOM.btnMostrarMais) {
            DOM.btnMostrarMais.addEventListener('click', () => {
                transactionManager.showAllTransactions();
            });
        }

        // 3. Comanda o especialista para renderizar o estado inicial
        transactionManager.updateDOM();
    };

    init();
});