document.addEventListener('DOMContentLoaded', () => {
    // Objeto para centralizar a seleção de elementos do DOM (Orquestrador)
    const DOM = {
        // Elementos gerenciados pelo transaction.js
        saldoAtual: document.getElementById('saldoAtual'),
        dividaCartao: document.getElementById('dividaCartao'), // OK
        receitasMes: document.getElementById('receitasMes'), // OK
        despesasMes: document.getElementById('despesasMes'), // OK
        transacoesLista: document.getElementById('transacoesLista'), // OK
        transacaoTemplate: document.getElementById('transacao-template'), // OK
        emptyStateMessage: document.getElementById('empty-state-message'), // OK
        filtroResumo: document.getElementById('filtro-resumo'), // OK
        notificationContainer: document.getElementById('notification-container'), // OK
        confirmationModal: document.getElementById('confirmation-modal'), // OK
        confirmationMessage: document.getElementById('confirmation-message'), // OK
        confirmBtnOk: document.getElementById('confirm-btn-ok'), // OK
        confirmBtnCancel: document.getElementById('confirm-btn-cancel'), // OK
        // Elementos de Análise (OK)
        despesasChartContainer: document.getElementById('despesas-chart-container'),
        despesasChart: document.getElementById('despesasChart'),
        despesasListaDetalhada: document.getElementById('despesas-lista-detalhada'),
        despesasChartEmpty: document.getElementById('despesas-chart-empty'),
        receitasChartContainer: document.getElementById('receitas-chart-container'),
        receitasChart: document.getElementById('receitasChart'),
        receitasListaDetalhada: document.getElementById('receitas-lista-detalhada'),
        receitasChartEmpty: document.getElementById('receitas-chart-empty'),
        saldoEvolucaoChartContainer: document.getElementById('saldo-evolucao-chart-container'),
        saldoEvolucaoChart: document.getElementById('saldoEvolucaoChart'),
        saldoChartEmpty: document.getElementById('saldo-chart-empty'),
        analiseResumo: document.getElementById('analise-resumo'),
        // Elementos de Orçamento (OK)
        orcamentoFormContainer: document.getElementById('orcamento-form-container'),
        orcamentoProgressoContainer: document.getElementById('orcamento-progresso-container'),
        // Elementos de Metas (OK)
        mainGoalPlaceholder: document.getElementById('main-goal-placeholder'),
        customMetasList: document.getElementById('custom-metas-list'),
        btnsCriarMeta: document.querySelectorAll('.btn-criar-meta'),
        btnResetGoals: document.getElementById('btnResetGoals'),
        // Elementos de Investimentos (OK)
        investmentsList: document.getElementById('investments-list'),
        investmentsChartContainer: document.getElementById('investments-chart-container'),
        investmentsChart: document.getElementById('investmentsChart'),
        investmentsChartEmpty: document.getElementById('investments-chart-empty'),
        // Elementos de Modais de Metas/Investimentos (OK)
        goalNameInput: document.getElementById('goal-name'),
        goalTargetValueInput: document.getElementById('goal-target-value'),
        goalSavedValueGroup: document.getElementById('goal-saved-value-group'),
        goalSavedValueInput: document.getElementById('goal-saved-value'),
        goalCategoryGroup: document.getElementById('goal-category-group'),
        goalCategorySelect: document.getElementById('goal-category'),
        goalCategoryOtherInput: document.getElementById('goal-category-other'),
        // Adicionando os elementos de modais que faltavam
        setGoalModal: document.getElementById('set-goal-modal'),
        mainGoalNameInput: document.getElementById('main-goal-name'),
        valorMetaInput: document.getElementById('valor-meta'),
        setGoalBtnOk: document.getElementById('set-goal-btn-ok'),
        createGoalModal: document.getElementById('create-goal-modal'),
        addToGoalModal: document.getElementById('add-to-goal-modal'),
        addToGoalMessage: document.getElementById('add-to-goal-message'),
        addToGoalValueInput: document.getElementById('add-to-goal-value'),
        addToGoalBtnOk: document.getElementById('add-to-goal-btn-ok'),
        createGoalBtnOk: document.getElementById('create-goal-btn-ok'),
        resetGoalsModal: document.getElementById('reset-goals-modal'),
        resetGoalsList: document.getElementById('reset-goals-list'),
        resetGoalsBtnOk: document.getElementById('reset-goals-btn-ok'),
        manageCategoriesModal: document.getElementById('manage-categories-modal'),
        categoryManagerList: document.getElementById('category-manager-list'),
        newCategoryNameInput: document.getElementById('new-category-name-input'),
        addNewCategoryBtn: document.getElementById('add-new-category-btn'),
        // Gráficos de Investimentos (OK)
        investmentAllocationChartContainer: document.getElementById('investment-allocation-chart-container'),
        investmentAllocationChart: document.getElementById('investmentAllocationChart'),
        investmentAllocationListaDetalhada: document.getElementById('investment-allocation-lista-detalhada'), // Novo
        investmentAllocationChartEmpty: document.getElementById('investment-allocation-chart-empty'), // Novo
        balancoContainerHome: document.getElementById('balanco-container-home'),
        // Elementos do novo layout
        topNav: document.querySelector('.top-nav'),
        pages: document.querySelectorAll('.page'),
        mainContent: document.querySelector('.main-content'),
        hamburgerBtn: document.querySelector('.hamburger-btn'),
        balancoContainerFullscreenTarget: document.getElementById('balanco-container-fullscreen-target'),
        formularioTransacao: document.querySelector('.formulario-transacao'),
        // Elementos gerenciados pelo javascript.js
        themeToggleBtn: document.getElementById('theme-toggle-btn'),
        toggleValuesBtn: document.getElementById('toggle-values-btn'),
        btnPagarFatura: document.getElementById('btnPagarFatura'),
        historicoFooter: document.getElementById('historico-footer'),
        btnMostrarMais: document.getElementById('btnMostrarMais'),
        searchInput: document.getElementById('search-input'),
        filterButtonsContainer: document.querySelector('.filtros-transacoes'),
        // Elementos do formulário dinâmico
        formTemplate: document.getElementById('form-template'),
        addTransactionModal: document.getElementById('add-transaction-modal'),
        openAddTransactionModalBtn: document.getElementById('open-add-transaction-modal'),
        // Botões de ação
        btnLimparTudo: document.getElementById('btnLimparTudo'),
        btnExportar: document.getElementById('btnExportar'),
        btnExportarCSV: document.getElementById('btnExportarCSV'),
        // Modal de Pagar Fatura
        payBillModal: document.getElementById('pay-bill-modal'),
        valorFaturaInput: document.getElementById('valor-fatura'),
        payBillBtnOk: document.getElementById('pay-bill-btn-ok'),
        payBillBtnCancel: document.getElementById('pay-bill-btn-cancel'),
    };

    // Estado gerenciado pelo orquestrador
    const State = {
        currentTheme: localStorage.getItem('theme') || 'light',
        valuesVisible: (localStorage.getItem('valuesVisible') || 'true') === 'true',
    };

    // --- Módulo Especialista em Transações ---
    const transactionManager = createTransactionManager(DOM);

    /**
     * Função de inicialização.
     */
    const init = () => {
        // Aplica o tema salvo
        document.documentElement.setAttribute('data-theme', State.currentTheme);
        DOM.themeToggleBtn.textContent = State.currentTheme === 'light' ? '🌙' : '☀️';

        // 1. Inicializa o módulo especialista
        transactionManager.init();
        // Informa ao módulo o estado inicial de visibilidade dos valores
        transactionManager.setValuesVisibility(State.valuesVisible);
        DOM.toggleValuesBtn.textContent = State.valuesVisible ? '👁️' : '🙈';

        // 2. Adiciona os event listeners que este orquestrador gerencia
        addEventListeners();

        // 3. Comanda o especialista para renderizar o estado inicial
        transactionManager.updateDOM();
    };

    /**
     * Centraliza a adição de todos os event listeners.
     */
    const addEventListeners = () => {
        // --- Listeners Globais ---
        DOM.themeToggleBtn.addEventListener('click', toggleTheme);
        DOM.toggleValuesBtn.addEventListener('click', toggleValues);
        DOM.hamburgerBtn.addEventListener('click', toggleMobileNav);
        DOM.topNav.addEventListener('click', handleNavigation);

        // --- Listeners do Formulário de Transação (usando delegação) ---
        DOM.openAddTransactionModalBtn.addEventListener('click', openTransactionModal);

        document.body.addEventListener('click', (e) => {
            // Fechar modal de transação
            if (e.target.matches('.close-modal-btn') || e.target === DOM.addTransactionModal) {
                DOM.addTransactionModal.classList.add('hidden');
            }
            // Gerenciar categorias
            if (e.target.matches('.btn-manage-categories')) {
                transactionManager.openCategoryManager();
            }
            // Cancelar edição no formulário
            if (e.target.id === 'cancelEditBtn') {
                transactionManager.resetFormState();
            }
        });

        document.body.addEventListener('submit', (e) => {
            if (e.target.id === 'formTransacao') {
                transactionManager.addTransaction(e);
            }
        });

        document.body.addEventListener('change', (e) => {
            const form = e.target.closest('form');
            if (!form) return;

            // Lógica para mostrar/esconder opções de pagamento
            if (e.target.matches('input[name="tipo"]')) {
                const isExpense = form.querySelector('input[name="tipo"][value="despesa"]').checked;
                const fieldset = form.querySelector('#forma-pagamento-fieldset');
                if (fieldset) fieldset.style.display = isExpense ? 'block' : 'none';
            }

            // Lógica para mostrar/esconder campo "Outra Categoria"
            if (e.target.matches('.form-input-categoria')) {
                const isOther = e.target.value === 'Outra';
                const otherInput = form.querySelector('#categoria-outra');
                otherInput.classList.toggle('hidden', !isOther);
                if (isOther) {
                    otherInput.focus();
                }
            }
        });

        // --- Listeners da Lista de Transações e Filtros ---
        DOM.filterButtonsContainer.addEventListener('click', (e) => {
            const target = e.target.closest('.filtro-btn');
            if (!target) return;
            DOM.filterButtonsContainer.querySelectorAll('.filtro-btn').forEach(btn => btn.classList.remove('active'));
            target.classList.add('active');
            transactionManager.setFilter(target.dataset.filter);
        });

        DOM.searchInput.addEventListener('input', (e) => transactionManager.setSearchTerm(e.target.value));
        DOM.btnMostrarMais.addEventListener('click', () => transactionManager.showAllTransactions());

        DOM.transacoesLista.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            const id = parseInt(button.dataset.id, 10);
            if (isNaN(id)) return;

            if (button.classList.contains('delete-btn')) {
                transactionManager.deleteTransaction(id);
            } else if (button.classList.contains('edit-btn')) {
                openTransactionModal(); // Abre o modal
                transactionManager.populateFormForEdit({ id }); // Preenche com os dados
            }
        });

        // --- Listeners de Ações e Modais Diversos ---
        DOM.btnLimparTudo.addEventListener('click', () => transactionManager.clearAllTransactions());
        DOM.btnExportar.addEventListener('click', () => transactionManager.exportTransactionsToHTML());
        DOM.btnExportarCSV.addEventListener('click', () => transactionManager.exportTransactionsToCSV());

        DOM.btnPagarFatura.addEventListener('click', openPayBillModal);
        DOM.payBillBtnOk.addEventListener('click', () => transactionManager.payCreditCardBill());
        DOM.payBillBtnCancel.addEventListener('click', () => DOM.payBillModal.classList.add('hidden'));

        // --- Listeners de Metas e Investimentos ---
        DOM.btnsCriarMeta.forEach(btn => btn.addEventListener('click', (e) => {
            const goalType = e.target.dataset.goalType || 'meta';
            transactionManager.openCreateGoalModal(goalType);
        }));

        DOM.btnResetGoals.addEventListener('click', () => transactionManager.openResetGoalsModal());

        // Delegação para os botões dentro dos cards de metas/investimentos
        DOM.mainContent.addEventListener('click', (e) => {
            const mainGoalPlaceholder = e.target.closest('#main-goal-placeholder');
            if (mainGoalPlaceholder) {
                if (e.target.closest('#btn-definir-meta')) {
                    transactionManager.openSetGoalModal();
                } else if (e.target.closest('#btn-adicionar-fundos-meta-principal')) {
                    transactionManager.openAddFundsToMainGoalModal();
                }
            }

            if (e.target.closest('.custom-goals-list')) {
                transactionManager.handleGoalActions(e);
            }
        });

        // Listeners para os modais de metas
        document.body.addEventListener('click', (e) => {
            const target = e.target;
            if (target.matches('#set-goal-btn-ok')) transactionManager.saveMainGoal();
            if (target.matches('#create-goal-btn-ok')) transactionManager.saveCustomGoal();
            if (target.matches('#add-to-goal-btn-ok')) transactionManager.addFundsToGoal();
            if (target.matches('#reset-goals-btn-ok')) transactionManager.resetSelectedGoals();
            if (target.matches('#add-new-category-btn')) transactionManager.addNewCategoryFromManager();

            // Fechar modais
            if (target.classList.contains('btn-secondary') && target.closest('.modal-footer') || target.classList.contains('close-modal-btn') || target.id === 'manage-categories-btn-close') {
                const modal = target.closest('.modal-overlay');
                if (modal) modal.classList.add('hidden');
            }
        });

        DOM.goalCategorySelect.addEventListener('change', () => {
            const isOther = DOM.goalCategorySelect.value === 'Outra';
            DOM.goalCategoryOtherInput.classList.toggle('hidden', !isOther);
            if (isOther) DOM.goalCategoryOtherInput.focus();
        });

        DOM.categoryManagerList.addEventListener('click', transactionManager.handleCategoryActions);

        // --- Listeners de Orçamento ---
        if (DOM.orcamentoFormContainer) {
            DOM.orcamentoFormContainer.addEventListener('change', (e) => {
                if (e.target.matches('input[data-category]')) {
                    transactionManager.handleBudgetChange(e);
                }
            });
        }
    };

    /**
     * Lida com a navegação entre as páginas.
     */
    const handleNavigation = (e) => {
        const target = e.target.closest('.nav-btn');
        if (!target) return;

        const pageName = target.dataset.page;

        // Atualiza botões
        DOM.topNav.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        target.classList.add('active');

        // Atualiza páginas
        DOM.pages.forEach(page => {
            page.classList.toggle('active', page.id === `${pageName}-page`);
        });

        // Re-renderiza os gráficos sempre que uma aba com gráficos for ativada.
        setTimeout(() => {
            if (['analise', 'metas', 'investimentos'].includes(pageName)) {
                transactionManager.renderCharts();
            }
        }, 50);

        // Fecha o menu mobile após clicar em um item
        if (DOM.topNav.classList.contains('nav-open')) {
            toggleMobileNav();
        }
    };

    /**
     * Abre o modal de transação, clonando o formulário do template.
     */
    const openTransactionModal = () => {
        const modalContent = DOM.addTransactionModal.querySelector('.modal-content');
        if (modalContent.querySelector('form')) {
            // Se o formulário já existe, apenas mostra o modal
            DOM.addTransactionModal.classList.remove('hidden');
            return;
        }

        // Clona o formulário do template
        const formClone = DOM.formTemplate.content.cloneNode(true);
        const form = formClone.querySelector('form');

        // Adiciona os fieldsets e botões dinamicamente
        const fieldsetTipo = document.createElement('fieldset');
        fieldsetTipo.innerHTML = `
            <legend>Tipo</legend>
            <div class="opcoes-radio">
                <label><input type="radio" name="tipo" value="receita" checked> Receita</label>
                <label><input type="radio" name="tipo" value="despesa"> Despesa</label>
            </div>
        `;

        const fieldsetPagamento = document.createElement('fieldset');
        fieldsetPagamento.id = 'forma-pagamento-fieldset';
        fieldsetPagamento.style.display = 'none'; // Começa escondido
        fieldsetPagamento.innerHTML = `
            <legend>Forma de Pagamento</legend>
            <div class="opcoes-radio">
                <label><input type="radio" name="forma_pagamento" value="debito" checked> Débito</label>
                <label><input type="radio" name="forma_pagamento" value="credito"> Crédito</label>
                <label><input type="radio" name="forma_pagamento" value="pix"> Pix</label>
            </div>
        `;

        const formButtons = document.createElement('div');
        formButtons.className = 'form-buttons';
        formButtons.innerHTML = `
            <button type="button" id="cancelEditBtn" class="btn-secondary hidden" style="width: 100%; margin-bottom: 10px;">Cancelar Edição</button>
            <button type="submit" id="addTransactionBtn" class="btn-sucesso" style="width: 100%;">Adicionar Transação</button>
        `;

        form.appendChild(fieldsetTipo);
        form.appendChild(fieldsetPagamento);
        form.appendChild(formButtons);

        modalContent.appendChild(formClone);
        
        transactionManager.renderTransactionCategoryOptions(); // Popula as categorias
        DOM.addTransactionModal.classList.remove('hidden');
    };

    /**
     * Alterna a visibilidade do menu de navegação mobile.
     */
    const toggleMobileNav = () => {
        DOM.hamburgerBtn.classList.toggle('active');
        DOM.topNav.classList.toggle('nav-open');
    };

    /**
     * Alterna o tema da aplicação.
     */
    const toggleTheme = () => {
        State.currentTheme = State.currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', State.currentTheme);
        localStorage.setItem('theme', State.currentTheme);
        DOM.themeToggleBtn.textContent = State.currentTheme === 'light' ? '🌙' : '☀️';
        transactionManager.renderCharts(); // Re-renderiza os gráficos para que se adaptem ao novo tema
    };

    /**
     * Alterna a visibilidade dos valores monetários.
     */
    const toggleValues = () => {
        State.valuesVisible = !State.valuesVisible;
        localStorage.setItem('valuesVisible', State.valuesVisible);
        transactionManager.setValuesVisibility(State.valuesVisible);
        transactionManager.updateDOM(); // Força a re-renderização de todos os componentes
        DOM.toggleValuesBtn.textContent = State.valuesVisible ? '👁️' : '🙈';
    };

    /**
     * Abre o modal para pagar a fatura do cartão.
     */
    const openPayBillModal = () => {
        if (DOM.payBillModal) {
            DOM.payBillModal.classList.remove('hidden');
            if (DOM.valorFaturaInput) {
                DOM.valorFaturaInput.value = '';
                DOM.valorFaturaInput.focus();
            }
        }
    };

    // Inicia a aplicação
    init();
});