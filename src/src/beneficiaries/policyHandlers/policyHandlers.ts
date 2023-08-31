import { AppAbility } from 'src/casl/casl-ability.factory';
import Action from 'src/casl/enums/actions';
import ProgramBeneficiary from 'src/casl/models/programBeneficiary.model';
import { IPolicyHandler } from 'src/casl/types/policyHandler.type';

export class ReadAllBeneficiariesPolicyHandler implements IPolicyHandler {
	handle(ability: AppAbility) {
		return ability.can(Action.ReadAll, ProgramBeneficiary);
	}
}

export class ReadOneBeneficiaryPolicyHandler implements IPolicyHandler {
	handle(ability: AppAbility) {
		return ability.can(Action.ReadOne, ProgramBeneficiary);
	}
}
