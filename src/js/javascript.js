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
        formaPagamentoFieldset: document.getElementById('forma-pagamento-fieldset'),
        btnLimparTudo: document.getElementById('btnLimparTudo'),
        btnExportar: document.getElementById('btnExportar'),
        btnExportarCSV: document.getElementById('btnExportarCSV'), // Novo botão para CSV
        notificationContainer: document.getElementById('notification-container'),
        despesasChartContainer: document.getElementById('despesas-chart-container'),
        despesasListaDetalhada: document.getElementById('despesas-lista-detalhada'),
        despesasChart: document.getElementById('despesasChart'),
        despesasChartEmpty: document.getElementById('despesas-chart-empty'),
        receitasChartContainer: document.getElementById('receitas-chart-container'),
        receitasListaDetalhada: document.getElementById('receitas-lista-detalhada'),
        receitasChart: document.getElementById('receitasChart'),
        receitasChartEmpty: document.getElementById('receitas-chart-empty'),
        saldoEvolucaoChart: document.getElementById('saldoEvolucaoChart'),
        analiseResumo: document.getElementById('analise-resumo'),
        saldoEvolucaoChartContainer: document.querySelector('.grafico-grande .grafico-container'),
        saldoChartEmpty: document.getElementById('saldo-chart-empty'),
        filtroResumo: document.getElementById('filtro-resumo'),
        confirmationModal: document.getElementById('confirmation-modal'),
        confirmationMessage: document.getElementById('confirmation-message'),
        confirmBtnOk: document.getElementById('confirm-btn-ok'),
        confirmBtnCancel: document.getElementById('confirm-btn-cancel'),
        payBillModal: document.getElementById('pay-bill-modal'),
        valorFaturaInput: document.getElementById('valor-fatura'),
        payBillBtnOk: document.getElementById('pay-bill-btn-ok'),
        payBillBtnCancel: document.getElementById('pay-bill-btn-cancel'),
        
        setGoalModal: document.getElementById('set-goal-modal'),
        mainGoalNameInput: document.getElementById('main-goal-name'),
        valorMetaInput: document.getElementById('valor-meta'),
        setGoalBtnOk: document.getElementById('set-goal-btn-ok'),
        setGoalBtnCancel: document.getElementById('set-goal-btn-cancel'),

        btnCriarMeta: document.getElementById('btnCriarMeta'),
        metasGrid: document.querySelector('.metas-grid'),
        createGoalModal: document.getElementById('create-goal-modal'),
        goalNameInput: document.getElementById('goal-name'),
        goalTargetValueInput: document.getElementById('goal-target-value'),
        createGoalBtnOk: document.getElementById('create-goal-btn-ok'),
        createGoalBtnCancel: document.getElementById('create-goal-btn-cancel'),
        addToGoalModal: document.getElementById('add-to-goal-modal'),
        addToGoalMessage: document.getElementById('add-to-goal-message'),
        addToGoalValueInput: document.getElementById('add-to-goal-value'),
        addToGoalBtnOk: document.getElementById('add-to-goal-btn-ok'),
        addToGoalBtnCancel: document.getElementById('add-to-goal-btn-cancel'),

        mainGoalContainer: document.getElementById('main-goal-container'),
        orcamentoFormContainer: document.getElementById('orcamento-form-container'),
        orcamentoProgressoContainer: document.getElementById('orcamento-progresso-container'),
        balancoContainerHome: document.getElementById('balanco-container-home'),
        balancoContainerFullscreenTarget: document.getElementById('balanco-container-fullscreen-target'),
        formularioTransacao: document.querySelector('.formulario-transacao'),
        // Elementos gerenciados pelo javascript.js
        toggleValuesBtn: document.getElementById('toggle-values-btn'),
        themeToggleBtn: document.getElementById('theme-toggle-btn'),
        btnPagarFatura: document.getElementById('btnPagarFatura'),
        historicoFooter: document.getElementById('historico-footer'),
        btnMostrarMais: document.getElementById('btnMostrarMais'),
        tabsNav: document.querySelector('.tabs-nav'),
        colunaLateral: document.querySelector('.coluna-lateral'),
        colunaPrincipal: document.querySelector('.coluna-principal'),
        historicoContent: document.getElementById('historico-content'),
        analiseContent: document.getElementById('analise-content'),
        metasContent: document.getElementById('metas-content'),
        orcamentoContent: document.getElementById('orcamento-content'),
        filterButtonsContainer: document.querySelector('.filtros-transacoes'),
    };

    // Estado gerenciado pelo orquestrador
    const State = {
        currentTheme: localStorage.getItem('theme') || 'light',
 valuesVisible: (localStorage.getItem('valuesVisible') || 'true') === 'true',
        // Armazena a referência ao elemento dos cards para movê-lo
        balancoContainerElement: document.querySelector('.balanco-container'),
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
        // Move o balanço para a posição inicial (coluna lateral)
        DOM.balancoContainerHome.appendChild(State.balancoContainerElement);
        DOM.balancoContainerFullscreenTarget.style.display = 'none';
        // Informa ao módulo o estado inicial de visibilidade dos valores
        transactionManager.setValuesVisibility(State.valuesVisible);
        if (DOM.toggleValuesBtn) {
            DOM.toggleValuesBtn.textContent = State.valuesVisible ? '👁️' : '🙈';
        }


        // 2. Adiciona os event listeners que este orquestrador gerencia
        const togglePaymentOptions = () => {
            const isExpense = document.querySelector('input[name="tipo"][value="despesa"]').checked;
            if (DOM.formaPagamentoFieldset) {
                DOM.formaPagamentoFieldset.style.display = isExpense ? 'block' : 'none';
            }
        };

        if (DOM.tipoRadios) {
            DOM.tipoRadios.forEach(radio => radio.addEventListener('change', togglePaymentOptions));
            togglePaymentOptions(); // Chama na inicialização para definir o estado correto do formulário
        }

        const toggleTheme = () => {
            State.currentTheme = State.currentTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', State.currentTheme);
            localStorage.setItem('theme', State.currentTheme);
            if (DOM.themeToggleBtn) DOM.themeToggleBtn.textContent = State.currentTheme === 'light' ? '🌙' : '☀️';
            transactionManager.renderCharts(); // Re-renderiza os gráficos para que se adaptem ao novo tema
        };

        if (DOM.themeToggleBtn) DOM.themeToggleBtn.addEventListener('click', toggleTheme);

        const toggleValues = () => {
            State.valuesVisible = !State.valuesVisible;
            localStorage.setItem('valuesVisible', State.valuesVisible);
            transactionManager.setValuesVisibility(State.valuesVisible);
            transactionManager.updateDOM(); // Força a re-renderização de todos os componentes
            if (DOM.toggleValuesBtn) {
                DOM.toggleValuesBtn.textContent = State.valuesVisible ? '👁️' : '🙈';
            }
        };
        if (DOM.toggleValuesBtn) DOM.toggleValuesBtn.addEventListener('click', toggleValues);

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

        // Listeners para o modal de criar meta personalizada
        if (DOM.btnCriarMeta) {
            DOM.btnCriarMeta.addEventListener('click', () => {
                transactionManager.openCreateGoalModal();
            });
        }
        if (DOM.createGoalBtnOk) {
            DOM.createGoalBtnOk.addEventListener('click', () => {
                transactionManager.saveNewCustomGoal();
            });
        }
        if (DOM.createGoalBtnCancel) {
            DOM.createGoalBtnCancel.addEventListener('click', () => {
                if (DOM.createGoalModal) DOM.createGoalModal.classList.add('hidden');
            });
        }

        // Listeners para o modal de adicionar fundos à meta
        if (DOM.addToGoalBtnOk) {
            DOM.addToGoalBtnOk.addEventListener('click', () => {
                transactionManager.addFundsToCustomGoal();
            });
        }
        if (DOM.addToGoalBtnCancel) {
            DOM.addToGoalBtnCancel.addEventListener('click', () => {
                if (DOM.addToGoalModal) DOM.addToGoalModal.classList.add('hidden');
            });
        }

        // Listener de eventos para os botões dentro dos cards de metas (delegação)
        if (DOM.metasGrid) {
            DOM.metasGrid.addEventListener('click', (e) => transactionManager.handleGoalActions(e));
        }

        // Adiciona listener para o container da meta principal, que agora é dinâmico
        if (DOM.mainGoalContainer) {
            DOM.mainGoalContainer.addEventListener('click', (e) => {
                if (e.target.closest('#btnSetGoal')) transactionManager.openSetGoalModal();
            });
        }

        // Listeners para o modal da meta principal
        if (DOM.setGoalBtnOk) {
            DOM.setGoalBtnOk.addEventListener('click', () => {
                transactionManager.saveMainGoal();
            });
        }

        if (DOM.setGoalBtnCancel) {
            DOM.setGoalBtnCancel.addEventListener('click', () => {
                if (DOM.setGoalModal) DOM.setGoalModal.classList.add('hidden');
            });
        }

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

        if (DOM.tabsNav) {
            DOM.tabsNav.addEventListener('click', (e) => {
                const target = e.target.closest('.tab-btn');
                if (!target) return;

                const tabName = target.dataset.tab;

                // Atualiza botões
                DOM.tabsNav.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                target.classList.add('active');

                // Atualiza painéis de conteúdo
                [DOM.historicoContent, DOM.analiseContent, DOM.orcamentoContent, DOM.metasContent].forEach(pane => {
                    if (pane) pane.classList.toggle('active', pane.id === `${tabName}-content`);
                });

                // Mostra ou esconde a coluna lateral para dar mais espaço ao conteúdo
                const isFullscreenTab = tabName === 'analise' || tabName === 'orcamento' || tabName === 'metas';

                if (isFullscreenTab) {
                    // Move os cards para o topo da coluna principal e esconde a lateral
                    DOM.balancoContainerFullscreenTarget.style.display = 'block';
                    DOM.balancoContainerFullscreenTarget.appendChild(State.balancoContainerElement);
                    DOM.colunaLateral.classList.add('hidden');
                } else {
                    // Move os cards de volta para a lateral e a exibe
                    DOM.balancoContainerFullscreenTarget.style.display = 'none';
                    DOM.balancoContainerHome.appendChild(State.balancoContainerElement);
                    DOM.colunaLateral.classList.remove('hidden');
                }

                if (tabName === 'analise') {
                    transactionManager.renderCharts();
                }
            });
        }

        // 3. Comanda o especialista para renderizar o estado inicial
        transactionManager.updateDOM();
    };

    init();
});